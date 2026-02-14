---
title: "Immigrate from markdown to memos efficiently"
published: 2026-02-14
description: "Using API of memos and python scripts to immigrate to memos"
category: "Development"
draft: false
cover: "2026-02-14-151558.png"
---

I have several markdown files needed to be immigrated to memos. To do it mannually is painful, so I use scripts and API to do it.

# Tutorial

## First
You need to combine all markdown files into one file named `source.md` and follows structure:

```markdown
%%%%%
<Time>
<Content>
<#Tags>
%%%%%
<Time2>
<Content2>
<#Tags2>
%%%%%
```

Example:

```markdown
%%%%%
2026-02-14 15:30
This is my first memo! 
![image](local_image_path.jpg)
#life
%%%%%
2026-01-14 15:30
This is my second memo! 
![pdf](local_pdf_path.pdf)
#daily
%%%%%
```

Make sure that the resources are in the **same dir** of python script.

## Secondly

Get Access Token from Memos: Settings -> Passwords -> Access Tokens

## Finally

Fill the following information into the script:

```
MEMOS_HOST: Your instance URL (e.g., https://memos.xxx.com).
MEMOS_TOKEN: Your private access token.
VISIBILITY: Choose between PRIVATE, PROTECTED, or PUBLIC.
```

## Python Script:

```python
import requests
import re
import time
import os
import base64
from datetime import datetime, timedelta, timezone 
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ================= CONFIGURATION AREA =================
MEMOS_HOST = "https://memos.xxx.com"
MEMOS_TOKEN = "memos_pat_2xxxxxxx..."
VISIBILITY = "PRIVATE"
FILE_NAME = "source.md" # Note: Ensure this matches your Markdown filename
# ======================================================

headers = {
    "Authorization": f"Bearer {MEMOS_TOKEN}",
    "Content-Type": "application/json"
}

# 🚀 Global Session Setup (Prevents connection drops)
def get_session():
    session = requests.Session()
    # Configure retry strategy for better stability
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    session.mount('http://', HTTPAdapter(max_retries=retries))
    return session

s = get_session()
TIMEOUT = (10, 30)

def upload_attachment(file_path):
    """ 
    Step 1: Upload attachment
    Reads local file, encodes to Base64, and sends to Memos server.
    """
    if not os.path.exists(file_path):
        print(f"    ⚠️ File does not exist: {file_path}")
        return None

    filename = os.path.basename(file_path)
    try:
        with open(file_path, 'rb') as f:
            b64_content = base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        print(f"    ❌ Read failed: {e}")
        return None

    payload = { "attachment": { "filename": filename, "content": b64_content } }
    url = f"{MEMOS_HOST}/memos.api.v1.AttachmentService/CreateAttachment"
    
    try:
        print(f"    📂 Uploading: {filename} ...")
        resp = s.post(url, headers=headers, json=payload, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            res_name = None
            if "name" in data: res_name = data["name"]
            elif "attachment" in data: res_name = data["attachment"].get("name")
            
            if res_name: return (res_name, file_path)
        print(f"    ❌ Upload failed: {resp.text[:100]}")
        return None
    except Exception as e:
        print(f"    ❌ Request error: {e}")
        return None

def process_content_lines(body_text):
    """ 
    Step 2: Content processing
    Identifies image markdown syntax and uploads local images while removing them from text.
    """
    final_lines = []
    resource_names = []
    uploaded_files = []
    image_line_pattern = re.compile(r'^\s*!\[(.*?)\]\((.*?)\)\s*$')

    lines = body_text.split('\n')
    for line in lines:
        match = image_line_pattern.match(line)
        if match:
            image_path = match.group(2)
            if not image_path.startswith("http"):
                result = upload_attachment(image_path)
                if result:
                    res_name, local_path = result
                    resource_names.append(res_name)
                    uploaded_files.append(local_path)
                    continue 
        final_lines.append(line.rstrip())

    final_content = "\n".join(final_lines).strip()
    return final_content, resource_names, uploaded_files

def fix_memo_time(memo_name, create_time_iso):
    """ 
    Step 3: Correct memo creation time
    Ensures the memo timestamp matches the Markdown entry date.
    """
    if not create_time_iso: return
    print(f"    🕒 Adjusting memo time -> {create_time_iso}")
    patch_url = f"{MEMOS_HOST}/api/v1/{memo_name}"
    try:
        # Pass only createTime to avoid duplicate field errors
        s.patch(patch_url, json={"createTime": create_time_iso}, params={"updateMask": "createTime"}, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        print(f"      ❌ Memo time adjustment error: {e}")

def fix_resource_time_force(resource_name, create_time_iso):
    """ 
    Step 3.5: Force correct resource creation time
    Synchronizes the attachment timestamp with the memo timestamp.
    """
    if not create_time_iso: return
    res_id = resource_name.split("/")[-1]
    paths_to_try = [f"resources/{res_id}", resource_name]
    
    success = False
    for path in paths_to_try:
        url = f"{MEMOS_HOST}/api/v1/{path}"
        try:
            resp = s.patch(url, json={"name": path, "createTime": create_time_iso}, params={"updateMask": "createTime"}, headers=headers, timeout=TIMEOUT)
            if resp.status_code == 200:
                success = True
                break 
        except: pass

def bind_resources(memo_name, resource_names):
    """ 
    Step 4: Bind resources
    Links the uploaded attachments to the created memo.
    """
    if not resource_names: return True
    print(f"    🔗 Binding {len(resource_names)} attachments...")
    url = f"{MEMOS_HOST}/api/v1/{memo_name}/attachments"
    payload = { "attachments": [{"name": name} for name in resource_names] }
    try:
        resp = s.patch(url, headers=headers, json=payload, timeout=TIMEOUT)
        if resp.status_code == 200:
            print(f"      ✅ Binding successful")
            return True
        elif resp.status_code == 405: 
            s.post(url, headers=headers, json=payload, timeout=TIMEOUT)
            print(f"      ✅ Binding successful (via POST fallback)")
            return True
        return False
    except: return False

def delete_local_files(file_list):
    """ 
    Step 5: Local file cleanup
    Deletes the local image files after successful upload and binding.
    """
    if not file_list: return
    print(f"    🗑️ Cleaning up local files...")
    for file_path in file_list:
        try:
            if os.path.exists(file_path): os.remove(file_path)
            print(f"      🔥 Deleted: {os.path.basename(file_path)}")
        except: pass

def parse_and_import():
    """ 
    Main Controller
    Parses the Markdown file and orchestrates the import workflow.
    """
    try:
        # Ensure FILE_NAME is set correctly in the configuration area
        with open("moment.md", 'r', encoding='utf-8-sig') as f:
            full_content = f.read()
    except Exception as e:
        print(f"❌ Failed to read file: {e}")
        return

    # Intelligent splitting by separator
    chunks = re.split(r'\n\s*%%%%%+\s*\n', full_content)
    if len(chunks) < 2 and "%%%%%" in full_content:
        chunks = re.split(r'%%%%%+', full_content)

    print(f"🚀 Processing {len([c for c in chunks if c.strip()])} blocks...")

    for i, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk: continue
        
        lines = chunk.split('\n')
        while lines and not lines[0].strip(): lines.pop(0)
        if len(lines) < 2: continue

        # 1. Parse time (with timezone adjustment)
        raw_time = lines[0].strip()
        create_time_iso = None
        try:
            # Parse format: 2026-02-11 12:00
            dt = datetime.strptime(raw_time, "%Y-%m-%d %H:%M")
            
            # Timezone Logic: Convert UTC+8 (Local) to UTC for API compatibility
            # Calculation: $$T_{utc} = T_{local} - 8 \text{ hours}$$
            dt_utc = dt - timedelta(hours=8)
            create_time_iso = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
            
        except ValueError:
            print(f"⚠️ Failed to parse time: {raw_time}")

        # 2. Prepare content
        body_text = "\n".join(lines[1:])
        final_content, resource_names, uploaded_files = process_content_lines(body_text)

        # 3. Create Memo
        create_url = f"{MEMOS_HOST}/api/v1/memos"
        data = { "content": final_content, "visibility": VISIBILITY }
        if create_time_iso: data["createTime"] = create_time_iso

        try:
            resp = s.post(create_url, headers=headers, json=data, timeout=TIMEOUT)
            if resp.status_code != 200:
                print(f"❌ Creation failed: {resp.text}")
                continue
            
            memo_data = resp.json()
            memo_name = memo_data.get("name")
            print(f"✅ Memo created: {memo_name}")

            # 4. Correct timestamps (Memo + Attachments)
            if create_time_iso:
                fix_memo_time(memo_name, create_time_iso)
                if resource_names:
                    for res_name in resource_names:
                        fix_resource_time_force(res_name, create_time_iso)

            # 5. Bind attachments
            bind_success = True
            if resource_names:
                bind_success = bind_resources(memo_name, resource_names)

            # 6. Delete local files
            if uploaded_files and bind_success:
                delete_local_files(uploaded_files)

        except Exception as e:
            print(f"❌ Workflow error: {e}")
        
        time.sleep(1)

if __name__ == "__main__":
    parse_and_import()
```
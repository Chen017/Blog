---
title: "Solve Umami No Data with NGINX Reverse Proxy"
published: 2025-02-24
description: "Fix Umami analytics not receiving data after NGINX reverse proxy by handling CORS correctly."
category: "Development"
cover: "屏幕截图 2025-02-24 194029.png"
---

# Background

I use 1Panel to deploy Halo and i want to use Umami to collect the statistics. But after i configure nginx and add code to head tag of html, i cannot see any statistics changing in Umami.

My Umami URL: [http://analysis.etalib.space](http://analysis.etalib.space)

My Halo URL: [https://www.etalib.space](https://www.etalib.space)

# Solution

This is about CORS(Cross-Origin Resource Sharing) issue. You may need to modify the naginx configuration.

This is my configuration:

    # Define the map directive to dynamically set Access-Control-Allow-Origin
    map $http_origin $allow_origin {
        default "";
        https://www.etalib.space https://www.etalib.space;
        # You can add more sites here
    }
    server {
        listen 80;
        server_name analysis.etalib.space;
        access_log /www/sites/analysis.etalib.space/log/access.log main;
        error_log /www/sites/analysis.etalib.space/log/error.log;
    
        # Other CORS headers remain unchanged
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
    
        location ^~ /.well-known/acme-challenge {
            allow all;
            root /usr/share/nginx/html;
        }
    
        location / {
            proxy_pass http://localhost:3002;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Host $server_name;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
    
            # Hide the Access-Control-Allow-Origin and Content-Security-Policy headers from the upstream server
            proxy_hide_header "Access-Control-Allow-Origin";
            proxy_hide_header "Content-Security-Policy";
    
            # Dynamically set Access-Control-Allow-Origin
            add_header Access-Control-Allow-Origin $allow_origin;
    
            # Uncomment the following line if credential support (e.g., cookies) is needed
            # add_header Access-Control-Allow-Credentials "true";
        }
    }

After that, you can see the statistics in Umami.

![](屏幕截图%202025-02-24%20194029.png)

# Reason by Grok3

### What is CORS?

CORS, or Cross-Origin Resource Sharing, is a security mechanism implemented by web browsers to control how resources (like data, images, or scripts) on one domain can be requested by a web page from a different domain. It’s a way for servers to tell browsers which origins (domains) are allowed to access their resources, relaxing the strict Same-Origin Policy that browsers enforce by default.

-   Same-Origin Policy: This is a security rule in browsers that prevents a web page from making requests to a different domain, protocol, or port than the one it was loaded from. For example, https://example.com​ can’t directly request data from https://api.anotherdomain.com​ unless allowed.
    
-   CORS: Provides a way to bypass this restriction in a controlled manner, enabling secure cross-domain communication.
    

* * *

### Why is CORS Needed?

Imagine you’re building a website:

-   Your frontend is hosted at https://www.example.com​.
    
-   Your backend API is hosted at https://api.example.com​.
    
-   When your frontend tries to fetch data from the API, the browser blocks the request because the origins (domains) are different (www.example.com​ vs. api.example.com​).
    

CORS solves this by allowing the server (api.example.com​) to specify which origins (e.g., www.example.com​) are permitted to access its resources.

* * *

### How Does CORS Work?

CORS relies on HTTP headers exchanged between the browser and the server. Here’s the process:

#### 1\. The Browser Makes a Request

When a web page sends a cross-origin request (e.g., using fetch​ or XMLHttpRequest​), the browser includes an Origin​ header in the request. For example:

    Origin: https://www.example.com
    

#### 2\. The Server Responds with CORS Headers

The server decides whether to allow the request and responds with specific headers, such as:

-   ​Access-Control-Allow-Origin​: Specifies which origins are allowed to access the resource.
    
    -   Example: Access-Control-Allow-Origin: https://www.example.com​ (only this origin is allowed).
        
    -   Example: Access-Control-Allow-Origin: \*​ (any origin is allowed, less secure).
        
-   ​Access-Control-Allow-Methods​: Lists the HTTP methods (e.g., GET​, POST​) permitted for the request.
    
    -   Example: Access-Control-Allow-Methods: GET, POST, OPTIONS​.
        
-   ​Access-Control-Allow-Headers​: Specifies which custom headers the request can include.
    
    -   Example: Access-Control-Allow-Headers: Content-Type, Authorization​.
        

If the server doesn’t include these headers or denies the origin, the browser blocks the response, and the web page can’t access the data.

#### 3\. Pre-flight Requests (for Complex Requests)

For certain requests (e.g., POST​ with custom headers or non-standard methods like PUT​), the browser first sends an OPTIONS pre-flight request to check if the server allows it. The pre-flight request asks, “Is this cross-origin request okay?” The server responds with the CORS headers, and only if approved does the actual request proceed.

Example pre-flight request:

    OPTIONS /api/data HTTP/1.1
    Origin: https://www.example.com
    Access-Control-Request-Method: POST
    Access-Control-Request-Headers: Content-Type
    

Server response:

    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: https://www.example.com
    Access-Control-Allow-Methods: POST
    Access-Control-Allow-Headers: Content-Type
    

* * *

### Key CORS Headers

Here are the most common CORS headers and their meanings:

1.  ​Access-Control-Allow-Origin​:
    
    -   Defines which origins can access the resource.
        
    -   Can be a specific domain (e.g., https://www.example.com​) or \*​ (all domains).
        
2.  ​Access-Control-Allow-Methods​:
    
    -   Lists allowed HTTP methods (e.g., GET​, POST​, PUT​).
        
3.  ​Access-Control-Allow-Headers​:
    
    -   Specifies allowed request headers (e.g., Authorization​, Content-Type​).
        
4.  ​Access-Control-Allow-Credentials​:
    
    -   If set to true​, allows cookies or credentials to be sent with the request. Note: \*​ can’t be used with this; a specific origin is required.
        
5.  ​Access-Control-Max-Age​:
    
    -   Indicates how long (in seconds) the pre-flight response can be cached (e.g., 86400​ for 24 hours).
        

* * *

### Example in Action

#### Scenario:

-   Frontend: https://www.example.com​
    
-   Backend API: https://api.example.com​
    
-   Frontend sends a GET​ request to https://api.example.com/data​.
    

#### Request:

    GET /data HTTP/1.1
    Host: api.example.com
    Origin: https://www.example.com
    

#### Server Response (Allowed):

    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: https://www.example.com
    Content-Type: application/json
    
    {"message": "Hello, world!"}
    

-   The browser allows the response, and the frontend receives the data.
    

#### Server Response (Denied):

    HTTP/1.1 200 OK
    Content-Type: application/json
    
    {"message": "Hello, world!"}
    

-   No Access-Control-Allow-Origin​ header → Browser blocks the response, and the frontend sees an error like:  
    Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource​.
    

* * *

### CORS in NGINX (Practical Example)

In your earlier question, we configured CORS in NGINX for analysis.etalib.space​. Here’s how it ties in:

```nginx
map $http_origin $allow_origin {
    default "";
    https://www.etalib.space https://www.etalib.space;
    https://markdown.etalib.space https://markdown.etalib.space;
    https://note.etalib.space https://note.etalib.space;
}

server {
    add_header Access-Control-Allow-Origin $allow_origin;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
    add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
}

```

-   What it does: NGINX checks the Origin​ header (e.g., https://www.etalib.space​) and only allows the request if it matches one of the listed domains. This ensures controlled cross-origin access.
    

* * *

### Common Issues with CORS

1.  Missing Headers: If the server doesn’t send Access-Control-Allow-Origin​, the browser blocks the response.
    
2.  Mismatched Origins: The Origin​ in the request must match what the server allows.
    
3.  Credentials with _​: Using Access-Control-Allow-Origin:_ ​ with Access-Control-Allow-Credentials: true​ is invalid.
    
4.  Pre-flight Failure: If the server doesn’t handle OPTIONS​ requests properly, complex requests fail.
    

* * *

### Summary

CORS is a bridge between security and functionality. It keeps the web safe by enforcing the Same-Origin Policy but allows flexibility for legitimate cross-domain requests. Servers use CORS headers to tell browsers, “It’s okay, this origin can access my resources.” In practice (like with NGINX), you configure these headers to match your app’s needs, balancing security and accessibility.

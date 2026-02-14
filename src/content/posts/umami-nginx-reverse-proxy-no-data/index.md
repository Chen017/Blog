---
title: "Solve Umami No Data with NGINX Reverse Proxy"
published: 2025-02-24
description: "Fix Umami analytics not receiving data after NGINX reverse proxy by handling CORS correctly."
category: "Development"
cover: "umami-2025-02-24-194029.png"
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

![](umami-2025-02-24-194029.png)
---
title: "OPPOWATCH应用开发浅指引"
published: 2025-02-06
description: "Quick setup guide for integrating OPPO Watch UI control packages in Android Studio."
category: "Development"
cover: "oppowatch-2025-02-06-220429.png"
---

# Step 1

微信公众号 OPPO开发者私信客服获取控件包及说明书 这样就可以调用官方控件 实现UI统一 这是2025年初的控件包: [202501210915113412.zip](202501210915113412.zip) 可以直接下载

# Step 2

打开Android Studio 创建`libs`文件夹 将`aar`压缩包放入 如图

  
![](oppowatch-2025-02-06-220429.png)

# Step 3

打开`settings.gradle` 加入如下代码到`dependencyResolutionManagement`层级下 参考图片

```groovy
repositories {
        google()
        mavenCentral()
        flatDir {
            dirs 'libs'
        }
    }
```

![](oppowatch-2025-02-06-220839.png)

# Step 4

打开app目录下的`build.gradle` 加入如下代码到`dependencies`层级下 参考图片

```groovy
implementation fileTree(includes: ['*.aar'], dir: 'libs')
```

![](oppowatch-2025-02-06-221417.png)

# Step 5

点击右上角`Sync Project with Gradle Files` 按钮或直接`Ctrl+Shift+O`快捷键

* * *

最后即可参考压缩包中手册进行调用开发

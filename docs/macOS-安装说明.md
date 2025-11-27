# macOS 安装说明

## ⚠️ 如果提示"已损坏，无法打开"

这是 macOS 的安全机制（Gatekeeper）阻止未签名应用。请按以下步骤操作：

### 方法一：右键打开（推荐）

1. 在 Finder 中找到 `weaviate-king.app`
2. **右键点击**应用图标
3. 选择菜单中的 **"打开"**
4. 在弹出的警告对话框中点击 **"打开"**

之后就可以正常双击打开了。

### 方法二：终端命令

打开终端（Terminal），执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/weaviate-king.app
```

或者如果应用在其他位置，替换为实际路径：

```bash
sudo xattr -rd com.apple.quarantine "/path/to/weaviate-king.app"
```

### 方法三：系统设置

1. 打开 **系统设置** → **隐私与安全性**
2. 在"安全性"部分，找到被阻止的应用提示
3. 点击 **"仍要打开"**

---

**注意**：这是 macOS 的正常安全机制，应用本身是安全的。如果以上方法都不行，请联系开发者。


# 动态文档加载系统使用说明

## 📖 简介

这是一个自动化的文档加载系统，您只需要在JSON配置文件中添加文档信息，页面会自动加载并显示文档链接，无需修改HTML代码！

## 🚀 快速开始

### 1. 添加新文档

只需两步：

**步骤1：** 将文档文件放到对应的目录中（如 `docs/java-backend/`）

**步骤2：** 编辑 `docs-index.json` 文件，添加文档信息：

```json
{
  "category": "扩展文档",
  "documents": [
    {
      "id": "your-doc-id",
      "title": "文档标题",
      "icon": "fas fa-file-alt",
      "file": "../docs/java-backend/your-file.md",
      "description": "文档描述"
    }
  ]
}
```

### 2. 在页面中使用

在HTML页面中添加以下代码：

```html
<!-- 引入加载器脚本 -->
<script src="../js/docs-loader.js"></script>

<!-- 初始化加载 -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    loadDocs('../docs/java-backend/docs-index.json');
});
</script>
```

## 📝 配置文件说明

### docs-index.json 结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 否 | 文档分类名称，显示在分隔符中 |
| `documents` | array | 是 | 文档列表 |
| `documents[].id` | string | 是 | 文档唯一标识 |
| `documents[].title` | string | 是 | 文档标题 |
| `documents[].icon` | string | 否 | Font Awesome图标类名 |
| `documents[].file` | string | 是 | 文档文件路径 |
| `documents[].description` | string | 否 | 文档描述，显示在tooltip中 |

## 🎨 常用图标

以下是常用的Font Awesome图标：

- `fas fa-file-alt` - 默认文档图标
- `fas fa-book` - 书本图标
- `fas fa-code` - 代码图标
- `fas fa-rocket` - 项目图标
- `fas fa-cogs` - 配置图标
- `fas fa-database` - 数据库图标
- `fas fa-server` - 服务器图标

更多图标请参考：https://fontawesome.com/icons

## 📂 目录结构示例

```
your-project/
├── docs/
│   ├── java-backend/
│   │   ├── docs-index.json      # 配置文件
│   │   ├── JUC.md               # 文档文件
│   │   ├── collection.md
│   │   └── project.md
│   ├── algorithm/
│   │   └── docs-index.json
│   └── README.md
├── pages/
│   ├── java-backend.html        # 页面文件
│   └── algorithm.html
└── js/
    └── docs-loader.js           # 加载器脚本
```

## 🔧 高级用法

### 自定义目标容器

```javascript
// 将文档加载到指定容器
loadDocs('../docs/java-backend/docs-index.json', '.custom-sidebar');
```

### 不显示分隔符

```javascript
const loader = new DocsLoader('../docs/java-backend/docs-index.json');
loader.load('.sidebar-menu', false); // false = 不显示分隔符
```

### 编程式使用

```javascript
const loader = new DocsLoader('../docs/java-backend/docs-index.json');

// 等待加载完成
await loader.load('.sidebar-menu');

// 加载后的回调
console.log('文档加载完成！');
```

## ⚠️ 注意事项

1. **路径问题**：确保JSON文件中的路径相对于HTML页面正确
2. **浏览器限制**：由于CORS限制，某些浏览器可能需要通过HTTP服务器访问
3. **文件编码**：确保JSON文件使用UTF-8编码
4. **格式校验**：JSON格式必须正确，可以使用在线工具校验

## 🐛 故障排除

### 文档列表不显示

1. 检查浏览器控制台是否有错误
2. 确认JSON文件路径正确
3. 验证JSON格式是否正确
4. 确保通过HTTP服务器访问（不是file://协议）

### 点击链接无法打开

1. 检查文档文件路径是否正确
2. 确认文档文件确实存在
3. 检查文件权限

## 📚 扩展其他页面

要在其他页面使用同样的功能：

1. 在对应的 `docs/` 子目录中创建 `docs-index.json`
2. 在HTML页面中引入 `docs-loader.js`
3. 调用 `loadDocs()` 函数

示例：

```html
<!-- algorithm.html -->
<script src="../js/docs-loader.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    loadDocs('../docs/algorithm/docs-index.json');
});
</script>
```

## 💡 最佳实践

1. **定期备份配置文件**：避免误操作丢失配置
2. **使用版本控制**：将JSON文件纳入Git管理
3. **统一命名规范**：文档文件使用英文，标题使用中文
4. **添加描述信息**：为每个文档添加清晰的描述
5. **分类管理**：按主题创建不同的配置文件

---

**享受自动化的便利吧！** 🎉

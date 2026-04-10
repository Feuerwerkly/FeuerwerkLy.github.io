# Feuerwerk's Knowledge Base

> 终身学习者的技术成长之路 - 个人学习成果展示网站

## 📖 项目简介

这是一个基于 GitHub Pages 托管的个人知识库网站，旨在记录和展示我的编程学习历程。网站采用文档系统的设计风格，模仿了 [JavaGuide](https://github.com/Snailclimb/JavaGuide) 和 [OI-wiki](https://github.com/OI-wiki/OI-wiki) 等优秀开源项目的展示方式。

## ✨ 特色功能

- 🎨 **现代化设计**：采用流行的文档系统风格，简洁美观
- 📱 **响应式布局**：完美适配各种设备，从手机到桌面
- 🔍 **智能导航**：侧边栏导航，快速定位内容
- 💻 **代码高亮**：支持多种编程语言的语法高亮
- 📊 **学习进度**：可视化展示各领域学习进度
- 🎯 **项目筛选**：支持按技术栈筛选项目展示
- ⚡ **快速加载**：纯静态网站，无需服务器，加载迅速

## 📁 项目结构

```
FeuerwerkLy.github.io/
├── index.html              # 网站首页
├── css/
│   ├── docs-style.css     # 文档系统样式
│   └── style.css          # 通用样式
├── js/
│   └── main.js            # 主要JavaScript功能
├── pages/                  # 各个页面
│   ├── about.html         # 关于我
│   ├── algorithm.html     # 算法学习
│   ├── java-backend.html  # Java后端
│   ├── ai.html            # 人工智能
│   ├── framework.html     # 框架技术
│   ├── database.html      # 数据库
│   ├── middleware.html    # 中间件
│   └── projects.html      # 项目展示
├── assets/                 # 资源文件
│   ├── images/           # 图片资源
│   ├── docs-images/      # 文档图片
│   └── fonts/            # 字体文件
├── docs/                  # 详细文档（可选）
│   ├── algorithm/
│   ├── java-backend/
│   ├── ai/
│   ├── framework/
│   ├── database/
│   └── middleware/
└── README.md              # 项目说明
```

## 🚀 快速开始

### 本地预览

1. **克隆项目**
```bash
git clone https://github.com/FeuerwerkLy/FeuerwerkLy.github.io.git
cd FeuerwerkLy.github.io
```

2. **启动本地服务器**

使用 Python:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

使用 Node.js:
```bash
npx http-server -p 8000
```

使用 VS Code Live Server 扩展（推荐）

3. **访问网站**
打开浏览器访问 `http://localhost:8000`

### 部署到 GitHub Pages

1. **推送代码到 GitHub**
```bash
git add .
git commit -m "Update website"
git push origin main
```

2. **启用 GitHub Pages**
- 进入仓库 Settings
- 找到 Pages 设置
- 选择 Source 为 Deploy from a branch
- 选择 main 分支和 / 根目录
- 点击 Save

3. **访问网站**
等待几分钟后，访问 `https://feuerwerky.github.io`

## 📝 内容维护

### 添加新文章

1. 在对应目录下创建新的 HTML 文件
2. 复用现有页面的样式和结构
3. 更新导航栏链接

### 更新项目展示

编辑 `pages/projects.html`，在 `.projects-grid` 部分添加新的项目卡片：

```html
<div class="project-card" data-category="your-category">
    <div class="project-header">
        <i class="fas fa-your-icon project-icon"></i>
        <div class="project-badge">Your Badge</div>
    </div>
    <div class="project-body">
        <h3 class="project-title">项目名称</h3>
        <p class="project-description">项目描述</p>
        <!-- 更多内容 -->
    </div>
</div>
```

### 自定义样式

主要样式文件：
- `css/docs-style.css` - 文档系统风格样式
- `css/style.css` - 通用样式

自定义颜色变量（在 `:root` 中）：
```css
:root {
    --primary-color: #3eaf7c;    /* 主色调 */
    --secondary-color: #42b983;  /* 辅助色 */
    /* 更多颜色变量... */
}
```

## 🛠️ 技术栈

- **HTML5** - 页面结构
- **CSS3** - 样式设计
- **JavaScript (ES6+)** - 交互功能
- **Font Awesome** - 图标库
- **Highlight.js** - 代码高亮
- **GitHub Pages** - 网站托管

## 📚 学习领域

- **算法与数据结构**：LeetCode 刷题、常见算法、数据结构详解
- **Java 后端开发**：Spring 生态、微服务、性能优化、设计模式
- **人工智能**：机器学习、深度学习、Python 实战
- **框架技术**：Spring 全家桶、MyBatis、Vue.js 等主流框架
- **数据库技术**：MySQL、Oracle、SQL 优化、事务处理
- **中间件技术**：Redis、消息队列、分布式、高并发

## 🎯 未来计划

- [ ] 添加博客功能
- [ ] 集成搜索功能
- [ ] 添加评论系统
- [ ] 支持暗色模式
- [ ] 添加更多学习笔记
- [ ] 优化移动端体验
- [ ] 添加 RSS 订阅
- [ ] 国际化支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

如果你有任何建议或发现了 bug，请：
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下优秀开源项目给我启发：

- [JavaGuide](https://github.com/Snailclimb/JavaGuide) - Java 学习指南
- [OI-wiki](https://github.com/OI-wiki/OI-wiki) - 算法竞赛知识库
- [VuePress](https://github.com/vuejs/vuepress) - Vue 驱动的静态网站生成器

## 📮 联系方式

- **GitHub**: [FeuerwerkLy](https://github.com/FeuerwerkLy)
- **Email**: your-email@example.com
- **博客**: [your-blog.com](https://your-blog.com)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**

Made with ❤️ by Feuerwerk

</div>
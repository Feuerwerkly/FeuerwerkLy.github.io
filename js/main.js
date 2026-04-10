// ==================== 导航栏功能 ====================
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // 滚动时导航栏效果
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 移动端菜单切换
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // 点击导航链接后关闭移动菜单
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle?.classList.remove('active');
        });
    });

    // 设置当前活动导航
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
});

// ==================== 滚动动画 ====================
function handleScrollAnimation() {
    const elements = document.querySelectorAll('.card, .project-card, .timeline-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// 页面加载完成后初始化
window.addEventListener('load', handleScrollAnimation);

// ==================== 数字计数动画 ====================
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start) + '+';
        }
    }, 16);
}

// 观察统计数字
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                const target = parseInt(entry.target.textContent);
                entry.target.classList.add('counted');
                animateCounter(entry.target, target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

window.addEventListener('load', initCounters);

// ==================== 技能条动画 ====================
function animateSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.style.width;
                entry.target.style.width = '0';
                setTimeout(() => {
                    entry.target.style.width = width;
                }, 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(bar => observer.observe(bar));
}

window.addEventListener('load', animateSkillBars);

// ==================== 项目筛选功能 ====================
function initProjectFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;

            // 更新按钮状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // 筛选项目
            projectCards.forEach(card => {
                const category = card.dataset.category;

                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('load', initProjectFilter);

// ==================== 平滑滚动 ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');

        // 只处理内部锚点
        if (href.startsWith('#') && href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = target.offsetTop - navbarHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ==================== 搜索功能 ====================
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');

    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.toLowerCase().trim();

        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function performSearch(query) {
    // 这里可以添加实际的搜索逻辑
    // 目前只是一个示例
    const results = [];

    // 搜索页面标题
    document.querySelectorAll('h1, h2, h3').forEach(header => {
        if (header.textContent.toLowerCase().includes(query)) {
            results.push({
                title: header.textContent,
                type: '标题'
            });
        }
    });

    displaySearchResults(results);
}

function displaySearchResults(results) {
    const searchResults = document.querySelector('.search-results');

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">未找到相关内容</div>';
    } else {
        searchResults.innerHTML = results.map(result => `
            <div class="search-result-item">
                <h4>${result.title}</h4>
                <span class="result-type">${result.type}</span>
            </div>
        `).join('');
    }

    searchResults.style.display = 'block';
}

window.addEventListener('load', initSearch);

// ==================== 主题切换 ====================
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const html = document.documentElement;

    // 检查本地存储的主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // 更新图标
            this.querySelector('i').className = newTheme === 'dark'
                ? 'fas fa-sun'
                : 'fas fa-moon';
        });
    }
}

window.addEventListener('load', initThemeToggle);

// ==================== 表单验证 ====================
function validateForm(form) {
    let isValid = true;
    const formData = new FormData(form);

    // 验证必填字段
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            showFieldError(field, '此字段为必填项');
        } else {
            field.classList.remove('error');
            removeFieldError(field);
        }
    });

    // 验证邮箱格式
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            isValid = false;
            emailField.classList.add('error');
            showFieldError(emailField, '请输入有效的邮箱地址');
        }
    }

    return isValid;
}

function showFieldError(field, message) {
    let errorElement = field.nextElementSibling;

    if (!errorElement || !errorElement.classList.contains('field-error')) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function removeFieldError(field) {
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('field-error')) {
        errorElement.style.display = 'none';
    }
}

// ==================== 图片懒加载 ====================
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

window.addEventListener('load', initLazyLoading);

// ==================== 返回顶部按钮 ====================
function initBackToTop() {
    const backToTop = document.querySelector('.back-to-top');

    if (!backToTop) return;

    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

window.addEventListener('load', initBackToTop);

// ==================== 工具函数 ====================
// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 获取随机数
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
}

// 控制台输出
console.log('%c🚀 Feuerwerk的个人网站', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%c欢迎来到我的学习成果展示网站！', 'color: #764ba2; font-size: 14px;');
/**
 * 导航网站首页脚本
 */

// DOM 元素
const categoryList = document.getElementById('categoryList');
const websiteContainer = document.getElementById('websiteContainer');
const datetimeElement = document.getElementById('datetime');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadingOverlay = document.getElementById('loadingOverlay');

// 当前选中的分类ID（从本地存储中恢复，如果没有则为null）
let currentCategoryId = localStorage.getItem('selectedCategoryId') || null;
let categories = [];
let websites = [];
let allWebsites = []; // 存储所有网站，用于搜索

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDateTime();
    initSearch();
    loadData();
    initKeyboardShortcuts();
});

// 初始化主题
function initTheme() {
    // 获取当前主题
    const currentTheme = localStorage.getItem('theme') || 'light';

    // 应用主题
    document.documentElement.setAttribute('data-theme', currentTheme);

    // 如果是自动主题，检查系统偏好
    if (currentTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark-mode', prefersDark);
    } else {
        document.documentElement.classList.toggle('dark-mode', currentTheme === 'dark');
    }
}

// 初始化键盘快捷键
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 如果在输入框中，不触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Alt + S: 聚焦搜索框
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Alt + A: 显示所有网站
        if (e.altKey && e.key === 'a') {
            e.preventDefault();
            selectCategory('all');
        }

        // Alt + M: 进入管理页面
        if (e.altKey && e.key === 'm') {
            e.preventDefault();
            window.location.href = 'admin.html';
        }

        // Esc: 清空搜索框
        if (e.key === 'Escape') {
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                resetSearch();
            }
        }

        // 数字键 1-9: 快速选择前9个分类
        if (!e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            const index = parseInt(e.key) - 1;
            const parentCategories = categories.filter(cat => !cat.parentId);

            if (parentCategories.length > index) {
                e.preventDefault();
                selectCategory(parentCategories[index].id);
            }
        }
    });

    // 添加快捷键提示
    addShortcutHints();
}

// 添加快捷键提示
function addShortcutHints() {
    // 搜索框
    if (searchInput) {
        searchInput.setAttribute('title', '快捷键: Alt+S');
    }

    // 管理链接
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        adminLink.setAttribute('title', '进入管理页面 (Alt+M)');
    }
}

// 显示加载状态
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

// 隐藏加载状态
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

// 加载所有数据
async function loadData() {
    showLoading();
    try {
        await Promise.all([
            loadCategories(),
            loadWebsites(),
            loadSettings()
        ]);
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败，请刷新页面重试', 'error');
    } finally {
        hideLoading();
    }
}

// 初始化搜索功能
function initSearch() {
    if (searchButton && searchInput) {
        // 点击搜索按钮时执行搜索
        searchButton.addEventListener('click', performSearch);

        // 按下回车键时执行搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // 输入框内容变化时，如果为空则显示所有网站
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                resetSearch();
            }
        });
    }
}

// 执行搜索
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        resetSearch();
        return;
    }

    // 记录当前是从搜索状态切换

    // 重置分类选择
    currentCategoryId = 'search';
    updateCategoryActiveState();

    // 过滤网站
    const searchResults = allWebsites.filter(site => {
        return site.title.toLowerCase().includes(searchTerm) ||
               site.description.toLowerCase().includes(searchTerm) ||
               site.url.toLowerCase().includes(searchTerm) ||
               (site.keywords && site.keywords.toLowerCase().includes(searchTerm));
    });

    // 显示搜索结果
    renderWebsites(searchResults);

    // 显示搜索结果数量
    if (searchResults.length === 0) {
        showNotification(`未找到与"${searchTerm}"相关的网站`, 'info');
    } else {
        showNotification(`找到 ${searchResults.length} 个与"${searchTerm}"相关的网站`, 'success');
    }
}

// 重置搜索
function resetSearch() {
    searchInput.value = '';
    if (currentCategoryId === 'search') {
        // 恢复到之前保存的分类，如果没有则恢复到"全部"分类
        const savedCategoryId = localStorage.getItem('selectedCategoryId') || 'all';
        selectCategory(savedCategoryId);
    }
}

// 初始化日期时间显示
function initDateTime() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// 更新日期时间
function updateDateTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    const dateStr = now.toLocaleDateString('zh-CN', dateOptions);
    const timeStr = now.toLocaleTimeString('zh-CN', timeOptions);

    datetimeElement.innerHTML = `<div class="date">${dateStr}</div><div class="time">${timeStr}</div>`;
}

// 加载网站设置
async function loadSettings() {
    try {
        const settings = await api.getSettings();
        if (settings && settings.siteTitle) {
            document.querySelector('header h1').textContent = settings.siteTitle;
        }
        if (settings && settings.footerText) {
            document.querySelector('footer p').textContent = settings.footerText;
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 加载分类
async function loadCategories() {
    try {
        categories = await api.getCategories();
        renderCategories();
    } catch (error) {
        console.error('加载分类失败:', error);
        showNotification('加载分类失败', 'error');
    }
}

// 渲染分类列表
function renderCategories() {
    // 清空现有分类
    categoryList.innerHTML = '';

    // 获取父分类和子分类，并按序号排序（序号越小，排序越靠前）
    const parentCategories = categories
        .filter(cat => !cat.parentId)
        .sort((a, b) => (a.order || 50000) - (b.order || 50000));
    const childCategories = categories.filter(cat => cat.parentId);

    // 创建分类容器
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('category-container');

    // 创建"全部"选项
    const allItem = document.createElement('li');
    allItem.classList.add('category-item');
    allItem.dataset.id = 'all';

    // 计算所有网站数量
    const totalWebsites = websites.length;
    allItem.innerHTML = `全部 <span class="website-count">(${totalWebsites})</span>`;

    allItem.addEventListener('click', () => selectCategory('all'));
    categoryList.appendChild(allItem);

    // 如果没有选中的分类，默认选中"全部"
    if (!currentCategoryId) {
        allItem.classList.add('active');
        currentCategoryId = 'all';
    } else if (currentCategoryId === 'all') {
        allItem.classList.add('active');
    }

    // 添加父分类
    parentCategories.forEach(parent => {
        const parentItem = document.createElement('li');
        parentItem.classList.add('category-item', 'parent-category');
        parentItem.dataset.id = parent.id;

        // 计算该父分类下的网站数量（包括子分类下的网站）
        const childCategoryIds = categories
            .filter(cat => cat.parentId === parent.id)
            .map(cat => cat.id);

        const parentWebsiteCount = websites.filter(site =>
            site.categoryId === parent.id ||
            childCategoryIds.includes(site.categoryId)
        ).length;

        parentItem.innerHTML = `${parent.name} <span class="website-count">(${parentWebsiteCount})</span>`;

        // 检查是否有子分类，并按序号排序（序号越小，排序越靠前）
        const children = childCategories
            .filter(child => child.parentId === parent.id)
            .sort((a, b) => (a.order || 50000) - (b.order || 50000));

        if (children.length > 0) {
            parentItem.classList.add('has-children');

            // 添加展开/折叠图标
            const toggleIcon = document.createElement('span');
            toggleIcon.classList.add('toggle-icon');
            toggleIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
            parentItem.appendChild(toggleIcon);

            // 创建子分类容器
            const childContainer = document.createElement('ul');
            childContainer.classList.add('subcategory-list');

            // 添加子分类
            children.forEach(child => {
                const childItem = document.createElement('li');
                childItem.classList.add('category-item', 'child-category');
                childItem.dataset.id = child.id;

                // 计算该子分类下的网站数量
                const childWebsiteCount = websites.filter(site => site.categoryId === child.id).length;
                childItem.innerHTML = `${child.name} <span class="website-count">(${childWebsiteCount})</span>`;
                childItem.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // 关闭所有其他展开的父分类（除了当前子分类的父分类）
                    document.querySelectorAll('.parent-category.expanded').forEach(item => {
                        if (item !== parentItem) {
                            item.classList.remove('expanded');
                            const sublist = item.querySelector('.subcategory-list');
                            if (sublist) {
                                sublist.style.display = 'none';
                            }
                        }
                    });

                    selectCategory(child.id);
                });

                // 如果是当前选中的分类，添加active类
                if (child.id === currentCategoryId) {
                    childItem.classList.add('active');
                    parentItem.classList.add('expanded');
                    childContainer.style.display = 'flex';
                }

                childContainer.appendChild(childItem);
            });

            // 父分类点击事件 - 展开/折叠子分类
            parentItem.addEventListener('click', () => {
                // 选中该父分类（这会触发 updateCategoryExpandState，处理展开/收缩状态）
                selectCategory(parent.id);
            });

            // 将子分类容器添加到父分类
            parentItem.appendChild(childContainer);
        } else {
            // 没有子分类的父分类直接添加点击事件
            parentItem.addEventListener('click', () => selectCategory(parent.id));
        }

        // 如果是当前选中的分类，添加active类
        if (parent.id === currentCategoryId) {
            parentItem.classList.add('active');
        }

        categoryList.appendChild(parentItem);
    });
}

// 更新分类激活状态
function updateCategoryActiveState() {
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        if (item.dataset.id === currentCategoryId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 更新分类展开状态
function updateCategoryExpandState() {
    // 首先关闭所有展开的父分类
    document.querySelectorAll('.parent-category.expanded').forEach(item => {
        item.classList.remove('expanded');
        const sublist = item.querySelector('.subcategory-list');
        if (sublist) {
            sublist.style.display = 'none';
        }
    });

    // 如果当前选中的是子分类，展开其父分类
    if (currentCategoryId && currentCategoryId !== 'all' && currentCategoryId !== 'search') {
        const selectedCategory = categories.find(cat => cat.id === currentCategoryId);

        if (selectedCategory && selectedCategory.parentId) {
            // 找到父分类元素
            const parentItem = document.querySelector(`.parent-category[data-id="${selectedCategory.parentId}"]`);

            if (parentItem) {
                // 展开当前子分类的父分类
                parentItem.classList.add('expanded');
                const childContainer = parentItem.querySelector('.subcategory-list');
                if (childContainer) {
                    childContainer.style.display = 'flex';
                }
            }
        } else if (selectedCategory && !selectedCategory.parentId) {
            // 如果选中的是父分类，展开该父分类
            const parentItem = document.querySelector(`.parent-category[data-id="${selectedCategory.id}"]`);
            if (parentItem && parentItem.classList.contains('has-children')) {
                parentItem.classList.add('expanded');
                const childContainer = parentItem.querySelector('.subcategory-list');
                if (childContainer) {
                    childContainer.style.display = 'flex';
                }
            }
        }
    }
}

// 选择分类
function selectCategory(categoryId) {
    // 更新当前选中的分类ID
    currentCategoryId = categoryId;

    // 将选择保存到本地存储（除了搜索状态）
    if (categoryId !== 'search') {
        localStorage.setItem('selectedCategoryId', categoryId);
    }

    // 更新分类列表中的active状态
    updateCategoryActiveState();

    // 更新分类展开状态
    updateCategoryExpandState();

    // 过滤并显示对应分类的网站
    filterWebsites();
}

// 加载网站
async function loadWebsites() {
    try {
        websites = await api.getWebsites();
        allWebsites = [...websites]; // 保存所有网站的副本
        filterWebsites();
        return websites;
    } catch (error) {
        console.error('加载网站失败:', error);
        showNotification('加载网站失败', 'error');
        throw error;
    }
}

// 根据当前选中的分类过滤并显示网站
function filterWebsites() {
    // 如果是搜索结果，不进行过滤
    if (currentCategoryId === 'search') {
        return;
    }

    // 过滤网站
    let filteredWebsites = websites;

    if (currentCategoryId && currentCategoryId !== 'all') {
        // 如果选中的是父分类，显示该父分类下的所有网站和其子分类下的网站
        const selectedCategory = categories.find(cat => cat.id === currentCategoryId);

        if (selectedCategory) {
            if (!selectedCategory.parentId) {
                // 是父分类，获取所有子分类ID
                const childCategoryIds = categories
                    .filter(cat => cat.parentId === currentCategoryId)
                    .map(cat => cat.id);

                // 过滤属于该父分类或其子分类的网站
                filteredWebsites = websites.filter(site =>
                    site.categoryId === currentCategoryId ||
                    childCategoryIds.includes(site.categoryId)
                );

                // 如果没有网站，只显示父分类下的网站
                if (filteredWebsites.length === 0) {
                    filteredWebsites = websites.filter(site => site.categoryId === currentCategoryId);
                }
            } else {
                // 是子分类，只显示该分类下的网站
                filteredWebsites = websites.filter(site => site.categoryId === currentCategoryId);
            }
        }
    }

    // 渲染过滤后的网站
    renderWebsites(filteredWebsites);
}

// 渲染网站列表
function renderWebsites(websiteList) {
    // 清空网站容器
    websiteContainer.innerHTML = '';

    if (websiteList.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.classList.add('empty-message');

        if (currentCategoryId === 'search') {
            emptyMessage.textContent = '没有找到匹配的网站';
        } else {
            emptyMessage.textContent = '没有找到网站，请添加新网站或选择其他分类';
        }

        websiteContainer.appendChild(emptyMessage);
        return;
    }

    websiteList.forEach(website => {
        const websiteCard = document.createElement('div');
        websiteCard.classList.add('website-card');

        // 获取网站所属分类
        const category = categories.find(cat => cat.id === website.categoryId);
        const categoryName = category ? category.name : '未分类';

        // 获取网站图标
        let favicon = website.favicon;
        if (!favicon) {
            try {
                favicon = `https://www.google.com/s2/favicons?domain=${new URL(website.url).hostname}&sz=64`;
            } catch (error) {
                favicon = '../public/img/default-favicon.png';
            }
        }

        websiteCard.innerHTML = `
            <div class="website-icon">
                <img src="${favicon}" alt="${website.title}" onerror="this.src='../public/img/default-favicon.png'">
            </div>
            <div class="website-info">
                <h3 class="website-title">${website.title}</h3>
                <p class="website-description">${website.description || '暂无描述'}</p>
                <span class="website-category">${categoryName}</span>
            </div>
        `;

        // 添加点击事件，点击卡片打开网站
        websiteCard.addEventListener('click', () => {
            window.open(website.url, '_blank');
        });

        websiteContainer.appendChild(websiteCard);
    });
}

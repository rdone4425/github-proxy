/**
 * 网站管理模块
 * 负责网站的添加、编辑、删除和信息获取功能
 */

// 网站管理器对象
const WebsiteManager = {
    // DOM 元素引用
    elements: {
        form: null,
        urlInput: null,
        titleInput: null,
        descriptionInput: null,
        parentCategorySelect: null,
        categorySelect: null,
        childCategoryGroup: null,
        keywordsInput: null,
        fetchInfoBtn: null,
        faviconPreview: null,
        domainInfo: null,
        submitBtn: null,
        cancelBtn: null,
        formContainer: null,
        addBtn: null
    },

    // 当前编辑的网站ID（如果是编辑模式）
    currentEditId: null,

    // 原始的表单提交处理函数
    originalSubmitHandler: null,

    /**
     * 初始化网站管理器
     * @param {Object} config - 配置对象
     */
    init(config) {
        // 合并配置
        this.config = {
            formId: 'websiteForm',
            formContainerId: 'addWebsiteForm',
            addBtnId: 'addWebsiteBtn',
            urlInputId: 'websiteUrl',
            titleInputId: 'websiteTitle',
            descriptionInputId: 'websiteDescription',
            parentCategorySelectId: 'websiteParentCategory',
            categorySelectId: 'websiteCategory',
            childCategoryGroupId: 'childCategoryGroup',
            keywordsInputId: 'websiteKeywords',
            fetchInfoBtnId: 'fetchInfoBtn',
            faviconPreviewId: 'faviconPreview',
            domainInfoId: 'domainInfo',
            cancelBtnId: 'cancelAddWebsite',
            onWebsiteAdded: null,
            onWebsiteUpdated: null,
            ...config
        };

        // 获取DOM元素
        this.elements.form = document.getElementById(this.config.formId);
        this.elements.formContainer = document.getElementById(this.config.formContainerId);
        this.elements.addBtn = document.getElementById(this.config.addBtnId);
        this.elements.urlInput = document.getElementById(this.config.urlInputId);
        this.elements.titleInput = document.getElementById(this.config.titleInputId);
        this.elements.descriptionInput = document.getElementById(this.config.descriptionInputId);
        this.elements.parentCategorySelect = document.getElementById(this.config.parentCategorySelectId);
        this.elements.categorySelect = document.getElementById(this.config.categorySelectId);
        this.elements.childCategoryGroup = document.getElementById(this.config.childCategoryGroupId);
        this.elements.keywordsInput = document.getElementById(this.config.keywordsInputId);
        this.elements.fetchInfoBtn = document.getElementById(this.config.fetchInfoBtnId);
        this.elements.faviconPreview = document.getElementById(this.config.faviconPreviewId);
        this.elements.domainInfo = document.getElementById(this.config.domainInfoId);
        this.elements.cancelBtn = document.getElementById(this.config.cancelBtnId);
        this.elements.submitBtn = this.elements.form.querySelector('button[type="submit"]');

        // 绑定事件处理函数
        this.bindEvents();

        return this;
    },

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        // 添加网站按钮点击事件
        if (this.elements.addBtn) {
            this.elements.addBtn.addEventListener('click', () => {
                // 重置表单并显示
                this.resetForm();
                this.showForm();
            });
        }

        // 取消按钮点击事件
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.hideForm());
        }

        // 获取信息按钮点击事件
        if (this.elements.fetchInfoBtn) {
            this.elements.fetchInfoBtn.addEventListener('click', () => this.fetchWebsiteInfo());
        }

        // 父分类选择事件
        if (this.elements.parentCategorySelect) {
            this.elements.parentCategorySelect.addEventListener('change', () => {
                this.updateChildCategorySelect();
            });
        }

        // 表单提交事件
        if (this.elements.form) {
            this.originalSubmitHandler = this.elements.form.onsubmit;
            this.elements.form.addEventListener('submit', (event) => this.handleSubmit(event));
        }
    },

    /**
     * 显示添加网站表单
     * @param {boolean} isNew - 是否是新建模式（如果是，则重置表单）
     */
    showForm(isNew = false) {
        if (this.elements.formContainer) {
            this.elements.formContainer.style.display = 'block';
        }
        if (this.elements.addBtn) {
            this.elements.addBtn.style.display = 'none';
        }

        // 只有在新建模式下才重置表单
        if (isNew) {
            this.resetForm();
        }
    },

    /**
     * 隐藏添加网站表单
     */
    hideForm() {
        if (this.elements.formContainer) {
            this.elements.formContainer.style.display = 'none';
        }
        if (this.elements.addBtn) {
            this.elements.addBtn.style.display = 'block';
        }
        this.resetForm();
    },

    /**
     * 重置表单
     */
    resetForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }

        // 重置图标预览
        if (this.elements.faviconPreview) {
            this.elements.faviconPreview.src = '../public/img/default-favicon.png';
        }

        // 重置域名信息
        if (this.elements.domainInfo) {
            this.elements.domainInfo.textContent = '输入URL并点击"获取信息"按钮获取网站信息';
        }

        // 重置当前编辑ID
        this.currentEditId = null;

        // 恢复原始提交处理函数
        if (this.elements.form && this.originalSubmitHandler) {
            this.elements.form.onsubmit = this.originalSubmitHandler;
        }
    },

    /**
     * 获取网站信息
     */
    async fetchWebsiteInfo() {
        const url = this.elements.urlInput.value;
        if (!url) {
            alert('请输入网站URL');
            return;
        }

        // 显示加载状态
        this.elements.fetchInfoBtn.classList.add('loading');
        this.elements.fetchInfoBtn.disabled = true;

        // 清除之前的错误状态
        this.elements.urlInput.classList.remove('error');

        try {
            // 调用API获取网站信息
            const info = await api.fetchWebsiteInfo(url);

            if (info) {
                // 填充表单字段
                this.elements.titleInput.value = info.title || '';
                this.elements.descriptionInput.value = info.description || '';

                // 更新网站图标
                if (info.favicon) {
                    this.elements.faviconPreview.src = info.favicon;
                    this.elements.faviconPreview.onerror = function() {
                        // 如果图标加载失败，使用默认图标
                        this.src = '../public/img/default-favicon.png';
                    };
                }

                // 更新域名信息
                if (info.domain) {
                    let domainText = `<span class="domain-name">${info.domain}</span>`;

                    // 如果有额外信息，添加到域名信息中
                    if (info.additionalInfo && info.additionalInfo.type) {
                        domainText += ` <span class="domain-type">(${info.additionalInfo.type})</span>`;
                    }

                    this.elements.domainInfo.innerHTML = domainText;
                }

                // 如果有关键词，填充关键词字段
                if (info.keywords && this.elements.keywordsInput) {
                    this.elements.keywordsInput.value = info.keywords;
                }

                // 处理特殊网站类型
                if (info.additionalInfo) {
                    // 如果是YouTube视频，添加频道信息到描述
                    if (info.additionalInfo.type === 'video' && info.additionalInfo.channel) {
                        if (!this.elements.descriptionInput.value.includes(info.additionalInfo.channel)) {
                            this.elements.descriptionInput.value = this.elements.descriptionInput.value.trim() +
                                (this.elements.descriptionInput.value ? '\n\n' : '') +
                                `来自: ${info.additionalInfo.channel}`;
                        }
                    }

                    // 如果是GitHub仓库，添加语言信息到描述
                    if (info.additionalInfo.type === 'repository' && info.additionalInfo.language) {
                        if (!this.elements.descriptionInput.value.includes('主要语言')) {
                            this.elements.descriptionInput.value = this.elements.descriptionInput.value.trim() +
                                (this.elements.descriptionInput.value ? '\n\n' : '') +
                                `主要语言: ${info.additionalInfo.language}`;
                        }
                    }
                }

                // 显示成功通知
                showNotification('获取网站信息成功', 'success');
            } else {
                // 显示警告通知
                showNotification('无法获取完整的网站信息，已填充可用数据', 'warning');

                // 重置域名信息
                this.elements.domainInfo.textContent = '无法获取网站信息';
            }
        } catch (error) {
            console.error('获取网站信息失败:', error);
            showNotification('获取网站信息失败: ' + (error.message || '未知错误'), 'error');

            // 标记输入框为错误状态
            this.elements.urlInput.classList.add('error');

            // 重置域名信息
            this.elements.domainInfo.textContent = '获取信息失败，请检查URL是否正确';
        } finally {
            // 恢复按钮状态
            this.elements.fetchInfoBtn.classList.remove('loading');
            this.elements.fetchInfoBtn.disabled = false;
        }
    },

    /**
     * 处理表单提交
     * @param {Event} event - 提交事件
     */
    async handleSubmit(event) {
        event.preventDefault();

        // 构建网站数据对象
        const websiteData = {
            url: this.elements.urlInput.value,
            title: this.elements.titleInput.value,
            description: this.elements.descriptionInput.value,
            categoryId: this.elements.categorySelect.value,
            keywords: this.elements.keywordsInput ? this.elements.keywordsInput.value : '',
            favicon: this.elements.faviconPreview.src !== '../public/img/default-favicon.png' ? this.elements.faviconPreview.src : ''
        };

        // 如果是编辑模式，添加ID
        if (this.currentEditId) {
            websiteData.id = this.currentEditId;
        }

        // 验证必填字段
        if (!websiteData.url || !websiteData.title || !websiteData.categoryId) {
            showNotification('请填写所有必填字段', 'error');
            return;
        }

        // 显示加载状态
        const originalButtonText = this.elements.submitBtn.innerHTML;
        this.elements.submitBtn.classList.add('loading');
        this.elements.submitBtn.disabled = true;

        try {
            if (this.currentEditId) {
                // 更新现有网站
                await api.updateWebsite(websiteData);
                showNotification('网站更新成功', 'success');

                // 调用更新回调
                if (typeof this.config.onWebsiteUpdated === 'function') {
                    this.config.onWebsiteUpdated(websiteData);
                }
            } else {
                // 添加新网站
                const newWebsite = await api.addWebsite(websiteData);
                showNotification('网站添加成功', 'success');

                // 调用添加回调
                if (typeof this.config.onWebsiteAdded === 'function') {
                    this.config.onWebsiteAdded(newWebsite);
                }
            }

            // 隐藏表单
            this.hideForm();
        } catch (error) {
            console.error(this.currentEditId ? '更新网站失败:' : '添加网站失败:', error);
            showNotification((this.currentEditId ? '更新网站失败: ' : '添加网站失败: ') + (error.message || '未知错误'), 'error');
        } finally {
            // 恢复按钮状态
            this.elements.submitBtn.classList.remove('loading');
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.innerHTML = originalButtonText;
        }
    },

    /**
     * 编辑网站
     * @param {Object} website - 要编辑的网站对象
     */
    editWebsite(website) {
        if (!website) return;

        // 设置当前编辑ID
        this.currentEditId = website.id;

        // 填充表单
        this.elements.urlInput.value = website.url;
        this.elements.titleInput.value = website.title;
        this.elements.descriptionInput.value = website.description || '';

        // 处理分类选择
        if (this.elements.parentCategorySelect && this.elements.categorySelect) {
            // 获取所有分类
            api.getCategories().then(categories => {
                // 查找当前网站的分类
                const currentCategory = categories.find(cat => cat.id === website.categoryId);

                if (currentCategory) {
                    if (currentCategory.parentId) {
                        // 如果是子分类，设置父分类和子分类
                        this.elements.parentCategorySelect.value = currentCategory.parentId;

                        // 更新子分类选择框
                        this.updateChildCategorySelect(categories).then(() => {
                            // 设置子分类
                            this.elements.categorySelect.value = website.categoryId;
                        });
                    } else {
                        // 如果是父分类，只设置父分类
                        this.elements.parentCategorySelect.value = website.categoryId;

                        // 更新子分类选择框
                        this.updateChildCategorySelect(categories).then(() => {
                            // 设置为"直接归属于父分类"
                            this.elements.categorySelect.value = website.categoryId;
                        });
                    }
                } else {
                    // 如果找不到分类，重置分类选择
                    this.elements.parentCategorySelect.value = '';
                    this.updateChildCategorySelect(categories);
                }
            }).catch(error => {
                console.error('获取分类失败:', error);
                // 如果获取分类失败，直接设置分类ID
                this.elements.categorySelect.value = website.categoryId;
            });
        } else {
            // 如果没有父分类选择框，直接设置分类ID
            if (this.elements.categorySelect) {
                this.elements.categorySelect.value = website.categoryId;
            }
        }

        // 填充关键词
        if (this.elements.keywordsInput && website.keywords) {
            this.elements.keywordsInput.value = website.keywords;
        }

        // 更新网站图标
        if (website.favicon) {
            this.elements.faviconPreview.src = website.favicon;
        } else {
            try {
                this.elements.faviconPreview.src = `https://www.google.com/s2/favicons?domain=${new URL(website.url).hostname}&sz=64`;
            } catch (error) {
                // 如果URL无效，使用默认图标
                this.elements.faviconPreview.src = '../public/img/default-favicon.png';
            }
        }

        // 更新域名信息
        if (website.domain) {
            this.elements.domainInfo.innerHTML = `<span class="domain-name">${website.domain}</span>`;
        } else {
            try {
                const domain = extractDomain(website.url);
                this.elements.domainInfo.innerHTML = `<span class="domain-name">${domain || '未知域名'}</span>`;
            } catch (error) {
                this.elements.domainInfo.innerHTML = `<span class="domain-name">未知域名</span>`;
            }
        }

        // 显示表单
        this.showForm();
    },

    /**
     * 删除网站
     * @param {string} websiteId - 要删除的网站ID
     * @param {Function} onDeleted - 删除成功后的回调函数
     */
    async deleteWebsite(websiteId, onDeleted) {
        if (!confirm('确定要删除这个网站吗？此操作无法撤销。')) return;

        try {
            await api.deleteWebsite(websiteId);
            showNotification('网站删除成功', 'success');

            // 调用删除回调
            if (typeof onDeleted === 'function') {
                onDeleted(websiteId);
            }
        } catch (error) {
            console.error('删除网站失败:', error);
            showNotification('删除网站失败: ' + (error.message || '未知错误'), 'error');
        }
    },

    /**
     * 更新分类选择框
     * @param {Array} categories - 分类数组
     */
    updateCategorySelect(categories) {
        if (!categories || !Array.isArray(categories)) {
            return;
        }

        // 更新父分类选择框
        if (this.elements.parentCategorySelect) {
            // 保存当前选中的父分类值
            const currentParentValue = this.elements.parentCategorySelect.value;

            // 清空父分类选择框
            this.elements.parentCategorySelect.innerHTML = '';

            // 添加父分类默认选项
            const defaultParentOption = document.createElement('option');
            defaultParentOption.value = '';
            defaultParentOption.textContent = '请选择父分类';
            this.elements.parentCategorySelect.appendChild(defaultParentOption);

            // 获取父分类并按序号排序（序号越小，排序越靠前）
            const parentCategories = categories
                .filter(cat => !cat.parentId)
                .sort((a, b) => (a.order || 50000) - (b.order || 50000));

            // 添加父分类选项
            parentCategories.forEach(parent => {
                const option = document.createElement('option');
                option.value = parent.id;
                option.textContent = parent.name;
                this.elements.parentCategorySelect.appendChild(option);
            });

            // 恢复之前选中的父分类值（如果仍然存在）
            if (currentParentValue && Array.from(this.elements.parentCategorySelect.options).some(opt => opt.value === currentParentValue)) {
                this.elements.parentCategorySelect.value = currentParentValue;
            }
        }

        // 更新子分类选择框
        this.updateChildCategorySelect(categories);
    },

    /**
     * 更新子分类选择框
     * @param {Array} categories - 分类数组（可选，如果不提供则会重新获取）
     */
    async updateChildCategorySelect(categories) {
        if (!this.elements.categorySelect) {
            return;
        }

        // 保存当前选中的子分类值
        const currentChildValue = this.elements.categorySelect.value;

        // 清空子分类选择框
        this.elements.categorySelect.innerHTML = '';

        // 添加子分类默认选项
        const defaultChildOption = document.createElement('option');
        defaultChildOption.value = '';
        defaultChildOption.textContent = '请选择子分类';
        this.elements.categorySelect.appendChild(defaultChildOption);

        // 获取选中的父分类ID
        const parentCategoryId = this.elements.parentCategorySelect ? this.elements.parentCategorySelect.value : '';

        if (parentCategoryId) {
            // 如果选择了父分类，显示子分类选择框
            if (this.elements.childCategoryGroup) {
                this.elements.childCategoryGroup.style.display = 'block';
            }

            // 如果没有提供分类数组，则获取所有分类
            if (!categories || !Array.isArray(categories)) {
                try {
                    categories = await api.getCategories();
                } catch (error) {
                    console.error('获取分类失败:', error);
                    showNotification('获取分类失败', 'error');
                    return;
                }
            }

            // 获取选中父分类的子分类并按序号排序（序号越小，排序越靠前）
            const childCategories = categories
                .filter(cat => cat.parentId === parentCategoryId)
                .sort((a, b) => (a.order || 50000) - (b.order || 50000));

            // 添加子分类选项
            childCategories.forEach(child => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = child.name;
                this.elements.categorySelect.appendChild(option);
            });

            // 添加"直接归属于父分类"选项
            const parentOption = document.createElement('option');
            parentOption.value = parentCategoryId;
            parentOption.textContent = `直接归属于父分类`;
            this.elements.categorySelect.appendChild(parentOption);

            // 恢复之前选中的子分类值（如果仍然存在）
            if (currentChildValue && Array.from(this.elements.categorySelect.options).some(opt => opt.value === currentChildValue)) {
                this.elements.categorySelect.value = currentChildValue;
            }
        } else {
            // 如果没有选择父分类，隐藏子分类选择框
            if (this.elements.childCategoryGroup) {
                this.elements.childCategoryGroup.style.display = 'none';
            }
        }
    }
}

// 导出网站管理器对象
window.WebsiteManager = WebsiteManager;

/**
 * 分类管理模块
 * 负责分类的添加、编辑、删除功能
 */

// 分类管理器对象
const CategoryManager = {
    // DOM 元素引用
    elements: {
        form: null,
        nameInput: null,
        parentSelect: null,
        orderInput: null,
        submitBtn: null,
        cancelBtn: null,
        formContainer: null,
        addBtn: null
    },

    // 当前编辑的分类ID（如果是编辑模式）
    currentEditId: null,

    // 原始的表单提交处理函数
    originalSubmitHandler: null,

    /**
     * 初始化分类管理器
     * @param {Object} config - 配置对象
     */
    init(config) {
        // 合并配置
        this.config = {
            formId: 'categoryForm',
            formContainerId: 'addCategoryForm',
            addBtnId: 'addCategoryBtn',
            nameInputId: 'categoryName',
            parentSelectId: 'parentCategory',
            orderInputId: 'categoryOrder',
            cancelBtnId: 'cancelAddCategory',
            onCategoryAdded: null,
            onCategoryUpdated: null,
            ...config
        };

        // 获取DOM元素
        this.elements.form = document.getElementById(this.config.formId);
        this.elements.formContainer = document.getElementById(this.config.formContainerId);
        this.elements.addBtn = document.getElementById(this.config.addBtnId);
        this.elements.nameInput = document.getElementById(this.config.nameInputId);
        this.elements.parentSelect = document.getElementById(this.config.parentSelectId);
        this.elements.orderInput = document.getElementById(this.config.orderInputId);
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
        // 添加分类按钮点击事件
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

        // 表单提交事件
        if (this.elements.form) {
            this.originalSubmitHandler = this.elements.form.onsubmit;
            this.elements.form.addEventListener('submit', (event) => this.handleSubmit(event));
        }
    },

    /**
     * 显示添加分类表单
     */
    showForm() {
        if (this.elements.formContainer) {
            this.elements.formContainer.style.display = 'block';
        }
        if (this.elements.addBtn) {
            this.elements.addBtn.style.display = 'none';
        }
    },

    /**
     * 隐藏添加分类表单
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

        // 重置当前编辑ID
        this.currentEditId = null;

        // 恢复原始提交处理函数
        if (this.elements.form && this.originalSubmitHandler) {
            this.elements.form.onsubmit = this.originalSubmitHandler;
        }
    },

    /**
     * 处理表单提交
     * @param {Event} event - 提交事件
     */
    async handleSubmit(event) {
        event.preventDefault();

        // 构建分类数据对象
        const categoryData = {
            name: this.elements.nameInput.value,
            parentId: this.elements.parentSelect.value || null,
            order: parseInt(this.elements.orderInput.value) || 50000
        };

        // 如果是子分类，获取父分类的序号并加到子分类序号前面
        if (categoryData.parentId) {
            try {
                // 获取所有分类
                const allCategories = await api.getCategories();

                // 查找父分类
                const parentCategory = allCategories.find(cat => cat.id === categoryData.parentId);

                if (parentCategory && parentCategory.order) {
                    // 将父分类序号乘以100万，然后加上子分类序号
                    // 这样可以确保同一父分类下的子分类会排在一起，并按子分类自己的序号排序
                    const parentOrder = Math.floor(parentCategory.order / 10) * 10;
                    const childOrder = categoryData.order % 10;
                    categoryData.order = parentOrder + childOrder;
                }
            } catch (error) {
                console.error('获取父分类序号失败:', error);
                // 如果获取失败，继续使用原始序号
            }
        }

        // 如果是编辑模式，添加ID
        if (this.currentEditId) {
            categoryData.id = this.currentEditId;
        }

        // 验证必填字段
        if (!categoryData.name) {
            showNotification('请填写分类名称', 'error');
            return;
        }

        // 显示加载状态
        const originalButtonText = this.elements.submitBtn.innerHTML;
        this.elements.submitBtn.classList.add('loading');
        this.elements.submitBtn.disabled = true;

        try {
            if (this.currentEditId) {
                // 更新现有分类
                await api.updateCategory(categoryData);
                showNotification('分类更新成功', 'success');

                // 调用更新回调
                if (typeof this.config.onCategoryUpdated === 'function') {
                    this.config.onCategoryUpdated(categoryData);
                }
            } else {
                // 添加新分类
                const newCategory = await api.addCategory(categoryData);
                showNotification('分类添加成功', 'success');

                // 调用添加回调
                if (typeof this.config.onCategoryAdded === 'function') {
                    this.config.onCategoryAdded(newCategory);
                }
            }

            // 隐藏表单
            this.hideForm();
        } catch (error) {
            console.error(this.currentEditId ? '更新分类失败:' : '添加分类失败:', error);
            showNotification((this.currentEditId ? '更新分类失败: ' : '添加分类失败: ') + (error.message || '未知错误'), 'error');
        } finally {
            // 恢复按钮状态
            this.elements.submitBtn.classList.remove('loading');
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.innerHTML = originalButtonText;
        }
    },

    /**
     * 编辑分类
     * @param {Object} category - 要编辑的分类对象
     */
    editCategory(category) {
        if (!category) return;

        // 设置当前编辑ID
        this.currentEditId = category.id;

        // 填充表单
        this.elements.nameInput.value = category.name;
        this.elements.parentSelect.value = category.parentId || '';
        this.elements.orderInput.value = category.order || 50000;

        // 显示表单
        this.showForm();
    },

    /**
     * 删除分类
     * @param {string} categoryId - 要删除的分类ID
     * @param {Array} categories - 所有分类数组
     * @param {Array} websites - 所有网站数组
     * @param {Function} onDeleted - 删除成功后的回调函数
     */
    async deleteCategory(categoryId, categories, websites, onDeleted) {
        // 检查是否有子分类
        const hasChildren = categories.some(cat => cat.parentId === categoryId);
        if (hasChildren) {
            alert('无法删除此分类，因为它包含子分类。请先删除所有子分类。');
            return;
        }

        // 检查是否有网站使用此分类
        const hasWebsites = websites.some(site => site.categoryId === categoryId);
        if (hasWebsites) {
            alert('无法删除此分类，因为有网站属于此分类。请先将这些网站移动到其他分类或删除它们。');
            return;
        }

        if (!confirm('确定要删除这个分类吗？此操作无法撤销。')) return;

        try {
            await api.deleteCategory(categoryId);
            showNotification('分类删除成功', 'success');

            // 调用删除回调
            if (typeof onDeleted === 'function') {
                onDeleted(categoryId);
            }
        } catch (error) {
            console.error('删除分类失败:', error);
            showNotification('删除分类失败: ' + (error.message || '未知错误'), 'error');
        }
    },

    /**
     * 更新父分类选择框
     * @param {Array} categories - 分类数组
     */
    updateParentSelect(categories) {
        if (!this.elements.parentSelect || !categories || !Array.isArray(categories)) {
            return;
        }

        // 保存当前选中的值
        const currentValue = this.elements.parentSelect.value;

        // 清空现有选项，保留"无"选项
        this.elements.parentSelect.innerHTML = '<option value="">无 (作为父分类)</option>';

        // 只添加父分类作为选项
        const parentCategories = categories.filter(cat => !cat.parentId);

        // 如果当前编辑的是父分类，则不应该将其自身作为父分类选项
        const filteredParentCategories = this.currentEditId
            ? parentCategories.filter(cat => cat.id !== this.currentEditId)
            : parentCategories;

        // 添加父分类选项
        filteredParentCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            this.elements.parentSelect.appendChild(option);
        });

        // 恢复之前选中的值（如果仍然存在）
        if (currentValue && Array.from(this.elements.parentSelect.options).some(opt => opt.value === currentValue)) {
            this.elements.parentSelect.value = currentValue;
        }
    }
};

// 导出分类管理器对象
window.CategoryManager = CategoryManager;

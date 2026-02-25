/**
 * 图书管理系统 - JavaScript 核心逻辑
 * 实现基于 localStorage 的本地数据持久化，支持完整的 CRUD 操作
 * 包含图书数据模型定义、存储封装、核心功能函数及数据验证机制
 */

/**
 * ==================== 1. 图书数据模型 ====================
 */
class Book {
    /**
     * 创建一本新书
     * @param {Object} data - 图书信息对象
     * @param {string} data.title - 书名（必填）
     * @param {string} data.author - 作者（必填）
     * @param {string} [data.isbn] - ISBN号
     * @param {string} [data.publisher] - 出版社
     * @param {string} [data.publishDate] - 出版日期 (ISO格式)
     * @param {string} [data.category] - 分类
     * @param {number} [data.totalCopies=1] - 总副本数
     * @param {number} [data.availableCopies] - 可用副本数，默认等于总副本数
     * @param {string} [data.description] - 描述
     * @param {string} [data.location] - 存放位置
     */
    constructor(data) {
        this.id = data.id || this.generateBookId();
        this.title = data.title?.trim() || '';
        this.author = data.author?.trim() || '';
        this.isbn = data.isbn ? data.isbn.trim().toUpperCase() : '';
        this.publisher = data.publisher?.trim() || '';
        this.publishDate = data.publishDate || '';
        this.category = data.category?.trim() || '';
        this.totalCopies = Number.isInteger(parseInt(data.totalCopies)) ? Math.max(0, parseInt(data.totalCopies)) : 1;
        this.availableCopies = data.availableCopies !== undefined ?
            Math.max(0, Math.min(this.totalCopies, parseInt(data.availableCopies))) :
            this.totalCopies;
        this.description = data.description?.trim() || '';
        this.location = data.location?.trim() || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 生成唯一的图书ID（时间戳+随机数）
     * @returns {string}
     */
    generateBookId() {
        return `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * ==================== 2. LocalStorage 安全读写封装 ====================
 */
const StorageManager = {
    /**
     * 将数据安全写入 localStorage
     * @param {string} key - 存储键名
     * @param {*} value - 要存储的值（自动序列化）
     * @returns {boolean} 是否成功
     */
    setItem(key, value) {
        try {
            // 检查是否支持 localStorage
            if (!window.localStorage) {
                throw new Error('当前浏览器不支持 localStorage');
            }

            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('localStorage 存储空间不足，请清理其他数据或使用更大容量的存储方式。');
            } else {
                console.error(`写入 localStorage 失败: ${e.message}`);
            }
            return false;
        }
    },

    /**
     * 从 localStorage 安全读取数据
     * @param {string} key - 键名
     * @param {*} defaultValue - 未找到时的默认值
     * @returns {*}
     */
    getItem(key, defaultValue = null) {
        try {
            if (!window.localStorage) {
                return defaultValue;
            }

            const item = localStorage.getItem(key);
            if (item === null || item === undefined) {
                return defaultValue;
            }

            return JSON.parse(item);
        } catch (e) {
            console.error(`读取 localStorage 失败: ${e.message}`);
            return defaultValue;
        }
    },

    /**
     * 移除指定键的数据
     * @param {string} key - 键名
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`删除 localStorage 数据失败: ${e.message}`);
        }
    }
};

/**
 * ==================== 3. 数据验证逻辑 ====================
 */
const BookValidator = {
    /**
     * 验证图书对象的有效性
     * @param {Object} bookData - 待验证的图书数据
     * @returns {{isValid: boolean, errors: string[]}}
     */
    validate(bookData) {
        const errors = [];

        // 必填项验证
        if (!bookData.title || bookData.title.trim().length === 0) {
            errors.push('书名为必填项');
        }

        if (!bookData.author || bookData.author.trim().length === 0) {
            errors.push('作者为必填项');
        }

        // ISBN格式验证（简单校验：10位或13位数字，可能包含连字符）
        if (bookData.isbn && !this.isValidISBN(bookData.isbn)) {
            errors.push('ISBN格式不正确，请输入有效的ISBN（如：978-7-111-12345-6 或 7111123456）');
        }

        // 库存数量验证
        const total = parseInt(bookData.totalCopies);
        if (isNaN(total) || total < 0) {
            errors.push('总副本数必须为非负整数');
        }

        const available = parseInt(bookData.availableCopies);
        if (isNaN(available) || available < 0 || available > total) {
            errors.push('可用副本数必须在0到总副本数之间');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * 检查ISBN是否符合基本格式
     * 支持 ISBN-10 和 ISBN-13
     * @param {string} isbn
     * @returns {boolean}
     */
    isValidISBN(isbn) {
        const cleaned = isbn.replace(/[-\s]/g, '');
        if (cleaned.length === 10) {
            return /^\d{9}[\dX]$/.test(cleaned);
        } else if (cleaned.length === 13) {
            return /^\d{13}$/.test(cleaned);
        }
        return false;
    },

    /**
     * 清理用户输入数据，防止XSS等攻击
     * @param {Object} data - 原始输入数据
     * @returns {Object} 清理后的数据
     */
    sanitize(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = value.trim()
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
};

/**
 * ==================== 4. 图书管理核心功能 ====================
 */
class BookManager {
    constructor() {
        this.storageKey = 'library_books_v1'; // 使用版本号便于未来迁移
        this.books = this.loadFromLocalStorage();
    }

    /**
     * 获取所有图书列表
     * @returns {Book[]}
     */
    getBooks() {
        return [...this.books]; // 返回副本避免外部修改
    }

    /**
     * 添加新图书
     * @param {Object} bookData - 图书信息
     * @returns {{success: boolean, message: string, book: Book|null}}
     */
    addBook(bookData) {
        try {
            // 数据清理
            const cleanedData = BookValidator.sanitize(bookData);

            // 数据验证
            const validation = BookValidator.validate(cleanedData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: '添加失败：' + validation.errors.join('；'),
                    book: null
                };
            }

            // 防止重复添加（通过ISBN去重）
            if (cleanedData.isbn && this.books.some(b => b.isbn === cleanedData.isbn)) {
                return {
                    success: false,
                    message: '该ISBN的图书已存在，不能重复添加',
                    book: null
                };
            }

            // 创建图书实例
            const newBook = new Book(cleanedData);

            // 添加到数组并保存
            this.books.unshift(newBook); // 新书放在前面
            if (this.saveToLocalStorage()) {
                return {
                    success: true,
                    message: '图书添加成功',
                    book: newBook
                };
            } else {
                // 回滚操作
                this.books = this.books.filter(b => b.id !== newBook.id);
                return {
                    success: false,
                    message: '图书添加失败：存储空间不足或系统错误',
                    book: null
                };
            }
        } catch (error) {
            console.error('添加图书时发生错误:', error);
            return {
                success: false,
                message: '添加图书时发生未知错误',
                book: null
            };
        }
    }

    /**
     * 删除图书
     * @param {string} id - 图书ID
     * @param {boolean} confirmed - 是否已确认（用于前端二次确认）
     * @returns {{success: boolean, message: string}}
     */
    deleteBook(id, confirmed = false) {
        try {
            const bookIndex = this.books.findIndex(b => b.id === id);
            if (bookIndex === -1) {
                return {
                    success: false,
                    message: '未找到指定的图书'
                };
            }

            const book = this.books[bookIndex];

            // 如果图书还有可借副本，建议确认
            if (!confirmed && book.availableCopies < book.totalCopies) {
                return {
                    success: false,
                    message: `该图书有${book.totalCopies - book.availableCopies}本未归还，确定要删除吗？`,
                    requiresConfirmation: true
                };
            }

            // 执行删除
            this.books.splice(bookIndex, 1);
            if (this.saveToLocalStorage()) {
                return {
                    success: true,
                    message: '图书删除成功'
                };
            } else {
                // 恢复（理论上不会到这里，因为删除只会减少数据）
                this.books.splice(bookIndex, 0, book);
                return {
                    success: false,
                    message: '删除失败：存储错误'
                };
            }
        } catch (error) {
            console.error('删除图书时发生错误:', error);
            return {
                success: false,
                message: '删除图书时发生未知错误'
            };
        }
    }

    /**
     * 编辑图书信息
     * @param {string} id - 图书ID
     * @param {Object} updateData - 更新的数据
     * @returns {{success: boolean, message: string, book: Book|null}}
     */
    editBook(id, updateData) {
        try {
            const bookIndex = this.books.findIndex(b => b.id === id);
            if (bookIndex === -1) {
                return {
                    success: false,
                    message: '未找到指定的图书',
                    book: null
                };
            }

            const originalBook = this.books[bookIndex];
            const mergedData = { ...originalBook, ...updateData };

            // 数据清理与验证
            const cleanedData = BookValidator.sanitize(mergedData);
            const validation = BookValidator.validate(cleanedData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: '更新失败：' + validation.errors.join('；'),
                    book: null
                };
            }

            // 防止ISBN冲突（排除自己）
            if (cleanedData.isbn && cleanedData.isbn !== originalBook.isbn &&
                this.books.some(b => b.id !== id && b.isbn === cleanedData.isbn)) {
                return {
                    success: false,
                    message: '该ISBN的图书已存在，不能重复使用',
                    book: null
                };
            }

            // 更新图书
            const updatedBook = new Book(cleanedData);
            this.books[bookIndex] = updatedBook;

            if (this.saveToLocalStorage()) {
                return {
                    success: true,
                    message: '图书信息更新成功',
                    book: updatedBook
                };
            } else {
                this.books[bookIndex] = originalBook; // 回滚
                return {
                    success: false,
                    message: '更新失败：存储空间不足',
                    book: null
                };
            }
        } catch (error) {
            console.error('编辑图书时发生错误:', error);
            return {
                success: false,
                message: '编辑图书时发生未知错误',
                book: null
            };
        }
    }

    /**
     * 查询图书（支持多字段模糊搜索）
     * @param {string} query - 搜索关键词
     * @returns {Book[]}
     */
    searchBooks(query) {
        if (!query || query.trim().length === 0) {
            return this.getBooks();
        }

        const keyword = query.trim().toLowerCase();

        return this.books.filter(book =>
            book.title.toLowerCase().includes(keyword) ||
            book.author.toLowerCase().includes(keyword) ||
            (book.isbn && book.isbn.toLowerCase().includes(keyword)) ||
            (book.publisher && book.publisher.toLowerCase().includes(keyword)) ||
            (book.category && book.category.toLowerCase().includes(keyword))
        );
    }

    /**
     * 将图书数组保存到 localStorage
     * @returns {boolean}
     */
    saveToLocalStorage() {
        return StorageManager.setItem(this.storageKey, this.books);
    }

    /**
     * 从 localStorage 加载图书数据
     * @returns {Book[]}
     */
    loadFromLocalStorage() {
        const savedBooks = StorageManager.getItem(this.storageKey, []);
        // 将普通对象转换为 Book 实例
        return savedBooks.map(data => {
            const book = new Book(data);
            book.id = data.id; // 确保ID不变
            return book;
        });
    }

    /**
     * 根据ID获取单本图书
     * @param {string} id - 图书ID
     * @returns {Book|null}
     */
    getBookById(id) {
        const book = this.books.find(b => b.id === id);
        return book ? { ...book } : null; // 返回副本
    }
}

// 导出模块（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BookManager, Book, StorageManager, BookValidator };
}

// 全局暴露（适用于直接引入script标签）
window.BookManager = BookManager;
window.Book = Book;
window.StorageManager = StorageManager;
window.BookValidator = BookValidator;

// 初始化全局实例
window.bookManager = new BookManager();
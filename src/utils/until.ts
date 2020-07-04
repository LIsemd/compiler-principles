/**
 *  数组去重
 */
export const unique = (array: any[]) => {
    return array.filter((elem, index, arr) => {
        return arr.indexOf(elem) === index
    })
}

/**
 *  判断大写字母
 */
export const isUpperCase = (char: string) => /^[A-Z]$/.test(char)

/**
 *  删除空格
 */
export const splitSpace = (str: string) => str.split(' ').join('')


/**
 *  深拷贝
 */
export const deepClone = (obj: object, hash = new WeakMap()) => {
    if (typeof obj !== 'object') {
        return obj
    }
    if (hash.has(obj)) {
        return hash.get(obj)
    }
    let res = obj instanceof Array ? [] : {}
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            res[key] = deepClone(obj[key], hash)
        }
    }
    hash.set(obj, res)
    return res
}

/**
 *  元组定义函数
 */ 
export const tuple = <T extends string[]>(...args: T) => args;

/**
 *  过滤不可打印字符
 */
export const filterInvisibleChar = (str: string) => {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) < 32 || str.charCodeAt(i) === 127) {
            str = str.replace(str[i], '')
        }
    }
    return str
}


/**
 *  删除所有子节点
 */
const deleteChildNodes = (parent: HTMLElement) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild)
    }
}

/**
 *  初始化节点
 */
export const initElements = (...elements: Array<HTMLElement>) => {
    elements.forEach(e => {
        deleteChildNodes(e)
    })
}




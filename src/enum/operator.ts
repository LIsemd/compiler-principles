// 支持的字符集
export const operator = {
    CONNECT: "·",
    UNION: "|",
    CLOSURE: '*',
    GROUP_LEFT: '(',
    GROUP_RIGHT: ')',
    EPSILON: 'ε',
    HASHTAG: '#',
    ARROW: '→'
}

// 运算符优先级
export const priorityMap = {
    [operator.UNION]: 1,
    [operator.CONNECT]: 2,
    [operator.CLOSURE]: 3
}

// 别名操作符
export const alias = '\''

// 点操作符
export const dot = '.'

// NotFound
export const NotFound = 'NotFound'
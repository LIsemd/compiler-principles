import { operator, priorityMap } from '../enum/operator'

class _RegExp {

    // 查看栈顶元素
    private static peek = (stack: string[]): string => stack.length && stack[stack.length - 1]
    
    // 判断操作符优先级
    private static getPriority = (a: string, b: string): boolean  => priorityMap[a] && priorityMap[a] >= priorityMap[b]
    
    /**
     * 为表达式插入连接符
     * 例如 (a|b)*a 转换后 (a|b)*·a
     */
    private static insertSeparator = (regExp: string): string => {
        let output = ''
        for (let i = 0; i < regExp.length; i++) {
            const token = regExp[i]
            output += token
            // 当前字符为 ( 或者 | ，则跳过本次循环
            if (token === operator.GROUP_LEFT || token === operator.UNION) {
                continue
            }
            if (i < regExp.length - 1) {
                const nextToken = regExp[i + 1]
                // 下一个字符存在，且为 * 、 ）、或者 | ，则跳过本次循环
                if (nextToken === operator.CLOSURE || nextToken === operator.GROUP_RIGHT || nextToken === operator.UNION) {
                    continue
                }
                // 添加连接符
                output += operator.CONNECT
            }
        }
        return output;
    }

    /**
     * 中缀表达式转后缀表达式
     * 优先级大小： | > * > .
     * 例如 (a|b)*·a 转换后 ab|*a.
     */
    private static infixToPostfix = (regExp: string): string => {
        let output = ''
        const stack = []
        for (let i = 0; i < regExp.length; i++) {
            let token = regExp[i]
            if (token === operator.GROUP_RIGHT) {
                // 当前字符为 ），弹出栈中元素并输出，直到栈顶字符为（
                while (_RegExp.peek(stack) && _RegExp.peek(stack) !== operator.GROUP_LEFT) {
                    output += stack.pop()
                }
                // 注意此处需要将（ 弹出
                stack.pop()
            } else if (token === operator.CONNECT || token === operator.UNION || token === operator.CLOSURE) {
                // 当前字符为 . 、| 或者 * ，按优先级顺序弹出元素并重新入栈 
                while (_RegExp.peek(stack) && _RegExp.getPriority(_RegExp.peek(stack), token)) {
                    output += stack.pop()
                }
                stack.push(token)
            } else if (token === operator.GROUP_LEFT) {
                // 当前字符为（ ，将其入栈
                stack.push(token)
            } else {
                // 当前字符为字母，则输出
                output += token
            }
        }
        // 输出栈中剩余的字符
        while (stack.length) {
            output += stack.pop()
        }
        return output
    }

    // 提供外部调用的接口函数
    public static translate(regExp: string): string {
        return this.infixToPostfix(this.insertSeparator(regExp))
    }

}

export default _RegExp;
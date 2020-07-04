import State from './State'
import { operator } from '../enum/operator'

class NFA {

    startNode: State
    endNode: State

    constructor(startNode: State, endNode: State) {
        this.startNode = startNode
        this.endNode = endNode
    }

    /**
     *  构建 NFA
     *  参数可以为 string 或 undefined (空转移)
     */
    private static createBasicNFA(token: string|undefined) {
        const startNode = new State(true, false)
        const endNode = new State(false, true)
        if (token) {
            startNode.addTransition(token, [endNode])
        } else {
            startNode.addEpsilonTransition(endNode)
        }
        return new NFA(startNode, endNode)
    }

    /**
     *  UNION: "a|b"
     *    
     *        o - a - o 
     *     /            \
     *  - o               #
     *     \           /
     *       o - b - o
     */
    private static union(a: NFA, b: NFA): NFA {
        const startNode = new State(true, false)
        const endNode = new State(false, true)
        startNode.addEpsilonTransition(a.startNode).addEpsilonTransition(b.startNode)
        a.startNode.isStart = false
        a.endNode.addEpsilonTransition(endNode).isEnd = false
        b.startNode.isStart = false
        b.endNode.addEpsilonTransition(endNode).isEnd = false
        return new NFA(startNode, endNode)
    }

    /**
     *  CLOSURE: 'a*'
     *         _  _
     *       /     \
     *  o - o - a - o - #
     *   \            /
     *    - - - - - -  
     */
    private static closure(a: NFA): NFA {
        const startNode = new State(true, false)
        const endNode = new State(false, true)
        startNode.addEpsilonTransition(a.startNode).addEpsilonTransition(endNode)
        a.endNode.addEpsilonTransition(a.startNode).addEpsilonTransition(endNode).isEnd = false
        a.startNode.isStart = false
        return new NFA(startNode, endNode)
    }

    /**
     *  获取当前节点的 ID
     *  当前节点 ID 为栈顶元素 ID + 1
     */
    private static getCurrentId(stack: Array<State>): number {
        const length = stack.length
        if (!length) {
            return 0
        }
        return stack[length - 1].id + 1
    }

    /**
     *  深度优先遍历 NFA ，记录 ID 并返回一个 State 数组
     */
    private static dfsforNFA(node: State, stack: Array<State>) {
        if (node.isVisited) {
            return
        }
        const id = NFA.getCurrentId(stack)
        stack.push(node.setId(id).visit())
        if (node.isEnd) {
            return
        }
        if (Object.keys(node.transition).length) {
            for (let key in node.transition) {
                const newNode = node.transition[key][0]
                NFA.dfsforNFA(newNode, stack)
            }
        }
        if (node.epsilonTransition.length) {
            for (let newNode of node.epsilonTransition) {
                NFA.dfsforNFA(newNode, stack)
            }
        }
    }
    
    /**
     *  CONNECT: "a·b"
     *  
     *  o - a - o - o - b - o
     */
    private static connect(a: NFA, b: NFA): NFA {
        const startNode = a.startNode
        const endNode = b.endNode
        a.endNode.addEpsilonTransition(b.startNode).isEnd = false
        b.startNode.isStart = false
        return new NFA(startNode, endNode)
    }

    /**
     *  根据后缀表达式构建 NFA
     */
    public static buildNFA(exp: string) {
        const stack: Array<NFA> = []
        for (let i = 0; i < exp.length; i++) {
            let token = exp[i]
            if (token === operator.GROUP_LEFT || token === operator.GROUP_RIGHT) {
                throw new Error('输入的表达式有误')
            } else if (token === operator.UNION) {
                // | ： 弹出栈内两个元素，并执行相关操作
                // 注意： 后弹出的元素应该在前面的位置
                try {
                    const b = stack.pop()
                    const a = stack.pop()
                    stack.push(NFA.union(a, b)) 
                } catch (error) {
                    throw new Error('输入的表达式有误')
                }
            } else if (token === operator.CLOSURE) {
                // * : 弹出栈内一个元素，并执行相关操作
                try {
                    const a = stack.pop()
                    stack.push(NFA.closure(a))
                } catch (error) {
                    throw new Error('输入的表达式有误')
                }
            } else if (token === operator.CONNECT) {
                // . : 弹出栈内两个元素，并执行相关操作
                // 注意： 后弹出的元素应该在前面的位置
                try {
                    const b = stack.pop()
                    const a = stack.pop()
                    stack.push(NFA.connect(a, b))
                } catch (error) {
                    throw new Error('输入的表达式有误')
                }
            } else if (token === operator.EPSILON){
                // 空转移
                stack.push(NFA.createBasicNFA(undefined))
            } else {
                // 字母 ：执行创建操作 
                stack.push(NFA.createBasicNFA(token))
            }
        }
        // 如果最终栈中不止一个元素，则表明表达式有误，需要抛出异常
        if (stack.length > 1) {
            throw new Error('输入的表达式有误')
        }
        return stack.pop()
    }


    /**
     *  获取 NFA State 数组
     */
    public static buildNFAStack(nfa: NFA) {
        const stack: State[] = []
        NFA.dfsforNFA(nfa.startNode, stack)
        return stack
    }

    /**
     *  初始化 NFA Stack
     */
    public static initNFAStack(stack: State[]) {
        stack.forEach(elem => {
            elem.isVisited = false
        })
        return this
    }

}

export default NFA;
import { unique } from '../utils/until';
import NFA from './NFA'
import State from './state';

class DFA {

    /**
     *  深度优先遍历 NFA ，返回一个空转移闭包数组
     */
    private static dfsForEpsilon(node: State, closure: Array<State>) {
        if (!node.epsilonTransition.length || node.isVisited) {
            return
        }
        node.visit()
        node.epsilonTransition.forEach(newNode => {
            closure.push(newNode)
            DFA.dfsForEpsilon(newNode, closure)
        })
    }

    /**
     *  获取当前节点的空转移闭包
     */
    private static getEpsilonClosure(node: State): Array<State> {
        // 为初始节点设置核状态
        const closure = [node]
        DFA.dfsForEpsilon(node, closure)
        return closure
    }

    /**
     *  根据闭包创建新的节点
     */
    private static createNewNode(nodeEpsilonClosure: State[], coreState: Number[]): State {
        let transitions: { [key: string]: State[] }[] = [], 
            oldStateIdArray: Number[] = []
        // 初始化节点
        const newNode = new State(false, nodeEpsilonClosure.some(elem => elem.isEnd))
        // 获取 State 数组 ID 以及转移数组
        nodeEpsilonClosure.forEach(elem => {
            oldStateIdArray.push(elem.id)
            if (Object.keys(elem.transition).length) {
                transitions = transitions.concat(elem.transition)
            }
        })
        // 数组去重并排序
        oldStateIdArray = unique(oldStateIdArray)
        oldStateIdArray.sort((a: number, b: number) => {
            return a - b
        })
        // 设置状态
        newNode.setOldStateId(oldStateIdArray).setCoreState(coreState)
        // 合并转移
        transitions.forEach(node => {
            let key = Object.keys(node)[0]
            newNode.addTransition(key, node[key])
        })
        return newNode
    }

    /**
     *  获取核状态节点的闭包，然后进行合并操作， 返回一个新的 State 数组
     */
    private static unionClosureNode(coreNode: Array<State>, coreState: Number[], nfaStack: State[]): State{
        let nodeEpsilonClosure: State[] = []
        // 初始化 NFA Stack
        NFA.initNFAStack(nfaStack)
        for (let node of coreNode) {
            nodeEpsilonClosure = nodeEpsilonClosure.concat(DFA.getEpsilonClosure(node))
        }
        return DFA.createNewNode(nodeEpsilonClosure, coreState)
    }

    /**
     *  递归遍历，将 NFA 转为 DFA 数组
     */
    private static NFAToDFA(node: State, hash: Object, result: State[], nfaStack: State[]) {
        if (hash[node.coreState.toString()]) {
            return
        }
        hash[node.coreState.toString()] = true
        // 根据节点的转移状态获取新的核状态数组
        for (let key in node.transition) {
            let coreState: Number[] = [], coreNode: State[] = []
            node.transition[key].forEach(elem => {
                coreState.push(elem.id)
                coreNode.push(nfaStack[elem.id])
            })
            coreState = unique(coreState)
            // 如果已经存在，则跳过本次循环
            if (hash[coreState.toString()]) {
                continue
            }
            const newNode = DFA.unionClosureNode(coreNode, coreState, nfaStack)
            result.push(newNode)
            DFA.NFAToDFA(newNode, hash, result, nfaStack)
        }
    }

    /**
     *  State 重命名
     */
    private static renameState(stack: State[], isSimplify: boolean = false) {
        // 存放 coreState 到 id 的映射
        const obj = {}
        // 当前节点重命名
        for (let i = 0; i < stack.length; i++) {
            stack[i].id = i
            // 最小化的情况特殊处理
            if (isSimplify) {
                stack[i].coreState.forEach(elem => {
                    obj[elem.toString()] = i
                })
            } else {
                const key = stack[i].coreState.sort((a: number, b: number) => a - b)
                obj[key.toString()] = i
            }
        }
        // 连接节点重命名
        stack.forEach(elem => {
            for (let key in elem.transition) {
                const states = elem.transition[key]
                // 最小化的情况特殊处理
                if (isSimplify) {
                    let id = parseInt(states.toString())
                    elem.transition[key] = obj[id]
                } else {
                    let id: Number[] = []
                    states.forEach(state => {
                        id.push(state.id)
                    })
                    id = unique(id).sort((a: number, b: number) => a - b)
                    elem.transition[key] = obj[id.toString()]
                }
            }
        })
    }

    /**
     *  分割 stateIdArrays
     */
    private static splitStateIdArrays(stateList: State[], stateIdArrays: number[][], time: number) {
        if (stateList.length === 1) {
            return
        }
        let stateTable: { id: number, to: { [key: string]: State[] } }[] = [],    // 状态表
            tempIdList: number[] = [],    // 记录相同节点 ID
            stateListA = [],    // state 数组 A
            stateIdListA = [],  // state 数组 A 的 ID
            stateListB = [],    // state 数组 B
            stateIdListB = [],  // state 数组 B 的 ID
            newStateList = [],  // 构建新的 stateList
            isSplit = false     // 是否需要分割

        // 获取状态表
        stateList.forEach(state => {
            stateTable.push({ id: state.id, to: state.transition })
        })
        // 判断节点是否相同
        for (let i = 0; i < stateTable.length - 1; i++) {
            for (let j = i + 1; j < stateTable.length; j++) {
                let pre = stateTable[i], next = stateTable[j]
                let total = Object.keys(pre.to).length, count = 0
                for (let key in pre.to) {
                    if (pre.to[key] === next.to[key]) {
                        count++
                    } else {
                        stateIdArrays.forEach(array => {
                            if (array.indexOf(Number(pre.to[key])) !== -1 && array.indexOf(Number(next.to[key])) !== -1) {
                                count++
                            }
                        })
                    }
                }
                // 相同则不需要分割
                if (count === total) {
                    if (tempIdList.indexOf(pre.id) === -1) {
                        tempIdList.push(pre.id)
                    }
                    if (tempIdList.indexOf(next.id) === -1) {
                        tempIdList.push(next.id)
                    }
                } else {
                    isSplit = true
                }
            }
        }
        // 需要分割的情况
        if (isSplit) {
            stateList.forEach(state => {
                if (tempIdList.indexOf(state.id) !== -1) {
                    stateListA.push(state)
                    stateIdListA.push(state.id)
                } else {
                    stateListB.push(state)
                    stateIdListB.push(state.id)
                }
            })
            stateIdArrays.forEach((elem, index, array) => {
                if (elem.indexOf(stateIdListA[0]) !== -1) {
                    array[index] = stateIdListA
                    array.push(stateIdListB)
                }
            })
            newStateList.push(stateListA)
            newStateList.push(stateListB)
        } else {
            newStateList = stateList
        }

        time++
        newStateList.forEach(stateList => {
            // 如果分割次数大于数组个数，则不再操作
            if (time <= stateList.length) {
                DFA.splitStateIdArrays(stateList, stateIdArrays, time)
            }
        })
    }

    /**
     *  分割 stateList
     */
    private static splitStateList(dfaStack: State[], stateIdArrays: number[][]): State[] {
        const stack: State[] = []
        stateIdArrays.forEach(array => {
            let isStart = false,
                isEnd = false,
                transition = {}

            array.forEach(value => {
                if (!isStart && dfaStack[value].isStart) {
                    isStart = true
                }
                if (!isEnd && dfaStack[value].isEnd) {
                    isEnd = true
                }
                if (!Object.keys(transition).length) {
                    transition = dfaStack[value].transition
                }
            })
            const state = new State(isStart, isEnd)
            state.transition = transition
            state.setOldStateId(array)
            state.setCoreState(array)
            stack.push(state)
        })
        DFA.renameState(stack, true)
        DFA.removeExtraAttributes(stack)
        return stack
    }

    /**
     *  删除状态的多余属性
     */
    private static removeExtraAttributes(stack: State[]) {
        stack.forEach(state => {
            delete state.coreState
            delete state.epsilonTransition
        })
    }
    
    /**
     *  根据 NFA Stack 构建 DFA
     */
    public static buildDFA(nfaStack: State[]): State[] {
        const stack: State[] = []
        let coreNode: State[] = [nfaStack[0]], 
            coreState: Number[] = [coreNode[0].id]
        // 获取 DFA 新的初始节点
        const startNode = DFA.unionClosureNode(coreNode, coreState, nfaStack)
        // 设置初始节点状态并入栈
        startNode.isStart = true
        stack.push(startNode)
        // 递归操作
        DFA.NFAToDFA(startNode, {}, stack, nfaStack)
        // 重命名
        DFA.renameState(stack)
        return stack
    }


    /**
     *  根据 DFA 构建最小 DFA
     */
    public static simplify(dfaStack: State[]): State[] {
        let statesArray: State[][] = [],
            stateIdArray: number[][] = [],
            finalState: State[] = [], 
            nonfinalState: State[] = [],
            finalStateId: number[] = [],
            nonFinalStateId: number[] = []

        // 终态和非终态分类
        dfaStack.forEach(state => {
            if (state.isEnd) {
                finalState.push(state)
                finalStateId.push(state.id)
            } else {
                nonfinalState.push(state)
                nonFinalStateId.push(state.id)
            }
        })
        if (finalState.length) {
            statesArray.push(finalState)
            stateIdArray.push(finalStateId)
        }
        if (nonfinalState.length) {
            statesArray.push(nonfinalState)
            stateIdArray.push(nonFinalStateId)
        }
        statesArray.forEach(stateList => {
            DFA.splitStateIdArrays(stateList, stateIdArray, 0)
        })
        return DFA.splitStateList(dfaStack, stateIdArray)
    }
}

export default DFA;
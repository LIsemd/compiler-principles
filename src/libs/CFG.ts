import { isUpperCase, tuple } from "../utils/until"
import { alias, operator } from "../enum/operator"


export interface IFirstAndFollow {
    base: string,
    first: Array<string>,
    follow: Array<string>
}
export interface IAnalysisRow { base: string, to: Array<string> }
export interface INextItem { nextChar: string, toId: number }
export interface ILivePrefixDFAItem { id: number, dfa: Array<string>, next: Array<INextItem> }
export interface IResult { 'stack': string, 'input': string, 'string': string, 'output': string }
export interface IInitalDfa { dfa: string[], id: number, fromId: number[], preChar: string }
export type AnalysisTable = Array<IAnalysisRow> 
const Methods = tuple('LL1', 'SLR1')
export type Method = typeof Methods[number]

class CFG {

    private grammar: Array<string>                                  // 语法集
    private terminalSymbols?: Array<string>                         // 终结符
    private unterminalSymbols?: Array<string>                       // 非终结符
    private withoutLeftRecursionSymbols: Array<Array<string>>       // 消除左递归后的语法集
    private withoutLeftFactorSymbols: Array<Array<string>>          // 提取左因子后的语法集
    private firstAndFollow: Array<IFirstAndFollow>                  // first集和 follow集
    private analysisTable: AnalysisTable                            // 预测分析表
    private isMatchLL_1: boolean                                    // 是否为 LL(1)
    private result: Array<IResult>                                  // 存储分析结果
    private extentionGrammar: string[][]                            // 拓广文法
    private livePrefixDFA: Array<ILivePrefixDFAItem>                // 文法识别活前缀的DFA

    constructor(grammer: Array<string>) {
        this.grammar = grammer
    }

    public setExtentionGrammar(extentionGrammar: string[][]) {
        this.extentionGrammar = extentionGrammar
        return this
    }

    public getExtentionGrammar() {
        return this.extentionGrammar
    }

    public setLivePrefixDFA(livePrefixDFA: Array<ILivePrefixDFAItem>) {
        this.livePrefixDFA = livePrefixDFA
        return this
    }

    public getLivePrefixDFA() {
        return this.livePrefixDFA
    }

    public setWithoutLeftRecursionSymbols(symbols: Array<Array<string>>) {
        this.withoutLeftRecursionSymbols = symbols
        return this
    }

    public getWithoutLeftRecursionSymbols() {
        return this.withoutLeftRecursionSymbols
    }

    public setWithoutLeftFactorSymbols(symbols: Array<Array<string>>) {
        this.withoutLeftFactorSymbols = symbols
        return this
    }

    public getWithoutLeftFactorSymbols() {
        return this.withoutLeftFactorSymbols
    }

    public setTerminalSymbols(symbols: Array<string>) {
        this.terminalSymbols = symbols
        return this
    }

    public getTerminalSymbols() {
        return this.terminalSymbols
    }

    public setUnterminalSymbols(symbols: Array<string>) {
        this.unterminalSymbols = symbols
        return this
    }

    public getUnterminalSymbols() {
        return this.unterminalSymbols
    }

    public setFirstAndFollow(symbols: Array<IFirstAndFollow>) {
        this.firstAndFollow = symbols
        return this
    }

    public getFirstAndFollow() {
        return this.firstAndFollow
    }

    public setAnalysisTable(table: AnalysisTable) {
        this.analysisTable = table
        return this
    }

    public getAnalysisTable() {
        return this.analysisTable
    }

    public setIsMatchLL_1(isMatch: boolean) {
        this.isMatchLL_1 = isMatch
    }

    public getIsMatchLL_1() {
        return this.isMatchLL_1
    }

    public getResult() {
        return this.result
    }

    /**
     *  初始化栈元素
     */
    private initStack(): Array<string> {
        const stack = []
        // 将 # 和 初态入栈
        const initialState = this.analysisTable[0].base
        stack.push('#')
        stack.push(initialState)
        return stack
    }

    /**
     *  根据字符查找分析表
     */
    private findByAnalysisTable(input: string, symbol: string): string {
        for (let elem of this.analysisTable) {
            if (elem.base === symbol && elem.to[input]) {
                return elem.to[input]
            }
        }
        return null
    }

    // 使用 LL1 文法进行自上而下分析
    private testByLL1(str: string): boolean  {
        let isMatch = true,
            isError = false
        // 为字符串末尾添加 # 
        if (str[str.length - 1] !== operator.HASHTAG) {
            str += operator.HASHTAG
        }
        const result: Array<IResult> = []
        const stack: Array<string> = this.initStack()
        const init: IResult = { 'stack': stack.join(' '), 'input': null, 'string': str, 'output': '初态' }
        result.push(init)
        for (let i = 0; i < str.length; i++) {
            const input = str[i]
            const rest = str.slice(i + 1)
            const temp: IResult = { 'stack': stack.join(' '), 'input': input, 'string': rest, 'output': null }
            let symbol = stack.pop()
            if (symbol === alias) {
                do {
                    symbol = stack.pop() + symbol
                } while (symbol[0] !== alias)
            }
            // 如果是非终结符  （非终结符即首字符为大写字母）
            if (isUpperCase(symbol[0])) {
                // 查找分析表对应的字符并进行转换，然后入栈该字符
                const targetStr = this.findByAnalysisTable(input, symbol)
                const targetArr: Array<string> = []
                if (!targetStr) {
                    temp.output = 'Error: 字符不匹配'
                    isError = true
                } else if (targetStr === operator.EPSILON) {
                    temp.output = symbol + ' ' + operator.ARROW + ' ' + targetStr
                    // 由于此时未成功匹配或为空字符，因此需要修正 i 的值
                    i--
                } else {
                    // 将字符串转换为数组
                    for (let j = targetStr.length - 1; j >= 0; j--) {
                        let char = targetStr[j]
                        while (targetStr[j] === alias) {
                            j--
                            char = targetStr[j] + char
                        }
                        targetArr.push(char)
                    }
                    stack.push(...targetArr)
                    temp.output = symbol + ' ' + operator.ARROW + ' ' + targetStr
                    // 由于此时未成功匹配或为空字符，因此需要修正 i 的值
                    i--
                }
            } else if (symbol === input) {
                // 如果字符为 # 并且为字符串末尾，则该语法合法
                if (symbol === operator.HASHTAG && i === str.length - 1) {
                    temp.output = '合法'
                } else {
                    temp.output = `成功匹配 ${symbol} `
                }
            } else {
                temp.output = 'Error： 字符不匹配'
                isError = true
            }
            result.push(temp)
            // 如果匹配错误，则跳出循环
            if (isError) {
                break
            }
        }
        this.result = result
        return isMatch
    }

    // 使用 SLR1 文法进行自下而上分析
    // private testBySLR1(str: string): boolean {
    //     let isMatch = true,
    //         isError = false

    //     return isMatch
    // }

    /**
     *  分析方法接口
     */
    public test(str: string, type: Partial<Method>): boolean {
        if (type === 'LL1') {
            this.isMatchLL_1 = this.testByLL1(str)
        } else if (type === 'SLR1'){

        } else {

        }
        return
    }
}

export default CFG
import { alias, operator, NotFound, dot } from './../enum/operator';
import CFG, { IFirstAndFollow, AnalysisTable, IAnalysisRow, ILivePrefixDFAItem, INextItem, IInitalDfa } from './CFG'
import { isUpperCase, splitSpace, deepClone, unique } from '../utils/until'

interface IUnterminalSymbol {
    key: number,
    value: string,
    to: Array<string>
}

interface IFollow {
    base: string,
    target: string,
    pre?: string,
    tail?: string
}


class Analysis {

    /**
     *  替换箭头符号
     */
    private static replaceArrow(grammar: string) {
        if (!grammar.includes(operator.ARROW)) {
            throw new Error('文法书写有误, 缺少 → 符号')
        }
        return grammar.replace(operator.ARROW, operator.UNION)
    }

    /**
    *  判断是否终结符
    */
    private static isTerminalSymbol(symbol: string) {
        return !isUpperCase(symbol)
    }

    /**
     *  格式化语法输入
     */
    private static formatGrammar(grammar: Array<string>): Array<Array<string>> {
        const symbols: Array<Array<string>> = []
        for (let i = 0; i < grammar.length; i++) {
            let str = splitSpace(grammar[i])
            str = this.replaceArrow(str)
            symbols[i] = str.split('|')
        }
        return symbols
    }

    /**
     *  根据语法字符集，返回终结符和非终结符
     */
    private static collectSymbols(symbols: Array<Array<string>>) {
        const terminalSet: Set<string> = new Set()
        const unterminalSet: Set<string> = new Set()
        symbols.forEach(symbol => {
            for (let str of symbol) {
                for (let i = 0; i < str.length; i++) {
                    let char = str[i]
                    if (!this.isTerminalSymbol(str[i])) {
                        // 计算非终结符的别名
                        while (str[i + 1] === alias) {
                            char += str[i + 1]
                            i++
                        }
                        unterminalSet.add(char)
                    } else {
                        terminalSet.add(char)
                    }
                }
            }
        })
        return [
            [...terminalSet],
            [...unterminalSet]
        ]
    }

    /**
     *  比较终结符的优先级
     */
    private static comparePriority(a: string, b: string, map: Array<IUnterminalSymbol>): boolean {
        let aKey: number, bKey: number
        map.forEach(elem => {
            if (elem.value === a) {
                aKey = elem.key
            } else if (elem.value === b) {
                bKey = elem.key
            }
        })
        return aKey > bKey
    }

    /**
     *  暴露隐式左递归
     */
    private static exposeImplicitLeftRecursion(symbols: Array<Array<string>>) {
        const unterminalSymbols: Array<IUnterminalSymbol> = []
        for (let i = 0; i < symbols.length; i++) {
            unterminalSymbols.push({ "key": i, "value": symbols[i][0], "to": symbols[i].slice(1) })
        }
        for (let i = 0; i < symbols.length; i++) {
            for (let j = 1; j < symbols[i].length; j++) {
                const headChar = symbols[i][j][0]
                // 如果首字母为非终结符且符合优先级要求，则替换非终结符
                if (!this.isTerminalSymbol(headChar) && this.comparePriority(symbols[i][0], headChar, unterminalSymbols)) {
                    unterminalSymbols.forEach(elem => {
                        // 如果替换后首字母存在非终结符，即存在左递归的可能，那么将其暴露出来 (优化)
                        if (elem.value === headChar && elem.to.some(e => !this.isTerminalSymbol(e[0]))) {
                            const tempSymbol = []
                            elem.to.forEach(str => {
                                str === operator.EPSILON
                                    ? tempSymbol.push(symbols[i][j].slice(1))
                                    : tempSymbol.push(str + symbols[i][j].slice(1))
                            })
                            symbols[i].splice(j, 1, ...tempSymbol)
                        }
                    })
                }
            }
        }
    }

    /**
     *  替换非终结符
     */
    private static replaceUnterminalSymbol(symbols: Array<Array<string>>) {
        for (let i = 0; i < symbols.length; i++) {
            const fromSymbol = symbols[i][0]
            const leftRecursion = [], others = []
            const tempSymbol = []
            const aliasSymbol = fromSymbol + alias
            let isRecursion = false
            for (let j = 1; j < symbols[i].length; j++) {
                let headChar = symbols[i][j][0]
                let k = 1
                while (symbols[i][j][k] === alias) {
                    headChar += alias
                }
                // 出现直接左递归
                if (!this.isTerminalSymbol(headChar) && headChar === fromSymbol) {
                    leftRecursion.push(symbols[i][j])
                    isRecursion = true
                } else {
                    others.push(symbols[i][j])
                }
            }
            if (isRecursion) {
                symbols[i].splice(1, symbols[i].length - 1, ...others)
                for (let k = 1; k < symbols[i].length; k++) {
                    if (symbols[i][k] === operator.EPSILON) {
                        symbols[i][k] = aliasSymbol
                    } else {
                        symbols[i][k] += aliasSymbol
                    }
                }
                if (leftRecursion.length) {
                    // 添加新的非终结符
                    tempSymbol.push(aliasSymbol)
                    leftRecursion.forEach(str => {
                        tempSymbol.push(str.slice(1) + aliasSymbol)
                    })
                    tempSymbol.push(operator.EPSILON)
                    symbols.push(tempSymbol)
                }
            }
        }
    }

    /**
     *  获取可到达的非终结符
     */
    private static getReachableSymbol(symbols: Array<Array<string>>): Array<string> {
        const reachableSymbolSet: Set<string> = new Set()
        const unReachableSymbolSet: Set<string> = new Set()
        reachableSymbolSet.add(symbols[0][0])
        for (let i = 0; i < symbols.length; i++) {
            const fromSymbol = symbols[i][0]
            if (reachableSymbolSet.has(fromSymbol)) {
                for (let j = 1; j < symbols[i].length; j++) {
                    const str = symbols[i][j]
                    if (str.includes(alias)) {
                        for (let k = 0; k < str.length - 1; k++) {
                            if (!this.isTerminalSymbol(str[k])) {
                                let char = str[k]
                                while (str[k + 1] === alias) {
                                    char += alias
                                    k++
                                }
                                reachableSymbolSet.add(char)
                                // 如果在不可达的非终结符中存在，则回溯该式子
                                if (unReachableSymbolSet.has(char)) {
                                    i = 1
                                    unReachableSymbolSet.delete(char)
                                }
                            } else {
                                reachableSymbolSet.add(str[k])
                            }
                        }
                    } else {
                        for (let char of str) {
                            if (!this.isTerminalSymbol(char)) {
                                reachableSymbolSet.add(char)
                                // 如果在不可达的非终结符中存在，则回溯该式子
                                if (unReachableSymbolSet.has(char)) {
                                    i = 1
                                    unReachableSymbolSet.delete(char)
                                }
                            }
                        }
                    }
                }
            } else {
                unReachableSymbolSet.add(fromSymbol)
            }
        }
        return [...reachableSymbolSet]
    }

    /**
     *  消除所有不可达的非终结符
     */
    private static eliminateUnreachableSymbol(symbols: Array<Array<string>>) {
        const reachableSymbols = this.getReachableSymbol(symbols)
        symbols.filter(row => reachableSymbols.indexOf(row[0]) !== -1)
    }

    /**
     *  消除左递归
     *  规则如下： 
     *  若产生式右部最左的符号是非终结符，且这个非终结符序号小于左部的非终结符，则用对应式子的右部来替换
     *  如果大于左部非终结符，则该隐式左递归无法暴露
     *  若出现直接左递归，则按照直接左递归的方法来消除
     *  最后消除所有不可达的非终结符
     */
    private static eliminateLeftRecursion(symbols: Array<Array<string>>): Array<Array<string>> {
        const newSymbol: Array<Array<string>> = deepClone(symbols)
        // 1.暴露隐式左递归
        this.exposeImplicitLeftRecursion(newSymbol)
        // 2.消除直接左递归
        this.replaceUnterminalSymbol(newSymbol)
        // 3.消除不可达的非终结符
        this.eliminateUnreachableSymbol(newSymbol)
        return newSymbol
    }

    /**
     *  提取最长公共字串
     */
    private static extractCommonPre(str: Array<string>) {
        const hashMap = new Map()
        let commonPre = ''
        for (let i = 1; i < str.length; i++) {
            for (let j = 1; j <= str[i].length; j++) {
                while (str[i][j] === alias) {
                    j++
                }
                let preStr = str[i].slice(0, j)
                if (!hashMap.has(preStr)) {
                    hashMap.set(preStr, 1)
                } else {
                    const count = hashMap.get(preStr) + 1
                    hashMap.set(preStr, count)
                }
            }
        }
        hashMap.forEach((value, key) => {
            // 选取最长的子串
            if (value > 1 && key.length > commonPre.length) {
                commonPre = key
            }
        })
        return commonPre
    }

    /**
     *  判断别名是否存在
     */
    private static isAliasExist(aliasSymbol: string, symbols: Array<Array<string>>) {
        let res = false
        symbols.forEach((row: Array<string>) => {
            if (row[0] === aliasSymbol) {
                res = true
            }
        })
        return res
    }

    /**
     *  提取左因子
     */
    private static extractLeftFactor(symbols: Array<Array<string>>): Array<Array<string>> {
        const newSymbol: Array<Array<string>> = deepClone(symbols)
        for (let i = 0; i < newSymbol.length; i++) {
            // 提取公共子串
            let commonPre = this.extractCommonPre(newSymbol[i])
            while (commonPre.length > 0) {
                // 获取来源字符
                const fromSymbol = newSymbol[i][0]
                // 获取符号别名，如果别名已存在，则再次添加 ‘ 符号
                let aliasSymbol = fromSymbol + alias
                while (this.isAliasExist(aliasSymbol, newSymbol)) {
                    aliasSymbol += alias
                }
                const tempSymbol = [aliasSymbol]
                // 从后往前记录相同因子的位置
                let factors: Array<{ 'index': number, 'rest': string }> = []
                for (let j = newSymbol[i].length - 1; j > 0; j--) {
                    // 如果拥有相同前缀因子，则提取并保留剩余子串
                    if (newSymbol[i][j].startsWith(commonPre)) {
                        factors.push({ 'index': j, 'rest': newSymbol[i][j].replace(commonPre, '') })
                    }
                }
                // 从后往前删除元素
                factors.forEach(f => {
                    newSymbol[i].splice(f.index, 1)
                    tempSymbol.push(f.rest ? f.rest : operator.EPSILON)
                })
                // 重命名元素并添加
                newSymbol[i].push(commonPre + aliasSymbol)
                newSymbol.push(tempSymbol)

                // 循环获取公共子串，直到不存在为止
                commonPre = this.extractCommonPre(newSymbol[i])
            }
        }
        return newSymbol
    }

    /**
    *  初始化 First 集和 Follow 集
    */
    private static initFirstAndFollow(symbols: Array<Array<string>>): Array<IFirstAndFollow> {
        const init: Array<IFirstAndFollow> = []
        symbols.forEach((s: Array<string>, index: number) => {
            const temp: IFirstAndFollow = { 'base': s[0], 'first': [], 'follow': [] }
            if (index === 0) {
                temp.follow.push(operator.HASHTAG)
            }
            for (let i = 1; i < s.length; i++) {
                let j = 0
                let headChar = s[i][j]
                // 注意，这里 j 的取值
                while (s[i][j + 1] === alias) {
                    headChar += alias
                    j++
                }
                if (!temp.first.includes(headChar)) {
                    temp.first.push(headChar)
                }
            }
            init.push(temp)
        })
        return init
    }

    /**
     *  根据 firstAndFollow 表获取非终结符对应的 First 集
     */
    private static getUnterminalSymbolFirst(from: string, firstAndFollow: Array<IFirstAndFollow>): Array<string> {
        // 判断首字母是否为终结符，如果是，直接返回
        if (this.isTerminalSymbol(from[0])) {
            return [from]
        }
        // 否则，查找对应 first 集
        let res = []
        firstAndFollow.forEach(elem => {
            if (from === elem.base) {
                res = elem.first
            }
        })
        return res
    }

    /**
     *  合并 first 集
     */
    private static combineFirst(first: string[], newFirst: string[]) {
        first = first.concat(newFirst).filter((value, index, arr) => {
            return arr.indexOf(value) === index
        })
        return first
    }

    /**
     *  根据规则 2 计算对应的 Follow 集
     */
    private static getUnterminalSymbolFollow(from: string, symbols: Array<Array<string>>, firstAndFollow: Array<IFirstAndFollow>): Array<Array<string>> {
        const map: Array<{ 'base': string, 'target': string, 'pre'?: string }> = []
        let res = []
        symbols.forEach(elem => {
            for (let i = 1; i < elem.length; i++) {
                // 如果是空字符，则直接记录
                if (elem[i] === operator.EPSILON) {
                    map.push({ 'base': operator.EPSILON, 'target': elem[0] })
                    continue
                }
                for (let j = 0; j < elem[i].length; j++) {
                    let current = elem[i][j]
                    // 如果是终结符，则跳过本次循环
                    if (this.isTerminalSymbol(current)) {
                        continue
                    }
                    // 判断是否为非终结符的别名
                    while (elem[i][j + 1] === alias) {
                        current += alias
                        j++
                    }
                    // 找到目标字符
                    if (from === current) {
                        // 如果是 A → aBb 或 A → aBC
                        // 则把 b 或 C 的 first 集赋给 B 的 follow 集
                        if (j < elem[i].length - 1) {
                            let followSymbol = elem[i][++j]
                            if (!this.isTerminalSymbol(followSymbol)) {
                                while (elem[i][j + 1] === alias) {
                                    followSymbol += alias
                                    j++
                                }
                                if (j === elem.length - 1) {
                                    const temp = { 'base': from, 'target': elem[0], 'tail': followSymbol }
                                    map.push(temp)
                                }
                                // 获取 follow 集并过滤其中的空字符
                                res = this.getUnterminalSymbolFirst(followSymbol, firstAndFollow)
                                    .filter(f => f !== operator.EPSILON)
                            } else if (!res.includes(followSymbol)){
                                res.push(followSymbol)
                            }
                        } else {
                            // 如果是 A → aB， 则把 A(target) -> B(base) 添加到 map 中
                            // 在后续流程中，把 A 的 follow 集赋给 B 的 follow 集
                            // 如果是 A → BC， 需要把 B 和 C 记录下来，因为它们都可能成为末尾符号
                            let k = current.length
                            let pre = j > 0 ? elem[i][j - k] : ''
                            let preSymbol = pre
                            while (pre === alias) {
                                preSymbol = elem[i][j - k] + preSymbol
                                pre = j > 0 ? elem[i][j - k] : ''
                                k++
                            }
                            const isExist = map.some(m => {
                                return m.base === from && m.target === elem[0]
                            })
                            let temp: { 'base': string, 'target': string, 'pre'?: string }
                            if (preSymbol && !this.isTerminalSymbol(preSymbol[0])) {
                                temp = { 'base': from, 'target': elem[0], 'pre': preSymbol }
                            } else {
                                temp = { 'base': from, 'target': elem[0] }
                            }
                            if (!isExist) {
                                map.push(temp)
                            }
                        }
                    }
                }
            }
        })
        return [
            res,
            map
        ]
    }


    /**
     *  根据规则 3 计算 Follow 集
     */
    private static getFollowByFirstAndFollow(obj: IFollow, firstAndFollow: Array<IFirstAndFollow>, unterminals: Array<IFollow>): Array<string> {
        let target: string, res = []
        // 如果是空字符，那么把它的前一个非终结符作为目标查找
        if (obj.base === operator.EPSILON) {
            for (let elem of unterminals) {
                if (elem.base === obj.target && elem.pre && elem.target !== obj.target) {
                    target = elem.target
                    obj.base = elem.pre
                    break
                }
            }
        } else if (obj.tail) {
            // 如果后续存在末尾非终结符
            const first = this.getUnterminalSymbolFirst(obj.tail, firstAndFollow)
            if (first.includes(operator.EPSILON)) {
                target = obj.target
            }
        } else {
            target = obj.target
        }
        firstAndFollow.forEach(elem => {
            if (target && target === elem.base) {
                res = elem.follow
            }
        })
        return res
    }

    /**
     *  判断是否均为非终结符
     */
    private static isAllUnterminals(str: string): boolean {
        for (let i = 0; i < str.length; i++) {
            if (this.isTerminalSymbol(str[i]) && str[i] !== alias) {
                return false
            }
        }
        return true
    }

    /**
     *  更新 first 中空字符
     */
    private static updateFirstByEpsilon(firstAndFollow: Array<IFirstAndFollow>, symbols: Array<Array<string>>) {

        for (let i = 0; i < firstAndFollow.length; i++) {
            const base = firstAndFollow[i].base
            const first = firstAndFollow[i].first
            // 如果 symbol 中不存在空字符，且不存在纯非终结字符，则 first 不可能有空字符存在
            if (first.includes(operator.EPSILON)) {
                let isExistEpsilon = false
                symbols.forEach(s => {
                    // 找到 base 对应的 symbol
                    if (s[0] === base) {
                        for (let j = 1, k = 0; j < s.length; j++) {
                            let headChar = s[j][k]
                            while (s[j][k + 1] === alias) {
                                headChar += alias
                                k++
                            }
                            if (headChar === operator.EPSILON || this.isAllUnterminals(s[j])) {
                                isExistEpsilon = true
                                break
                            }
                        }
                        // 如果不存在空字符，则过滤
                        if (!isExistEpsilon) {
                            firstAndFollow[i].first = first.filter(f => f !== operator.EPSILON)
                        } else {
                            //     M → Ab | ε
                            //     A  → aM | ε
                            // 找到存在空字符的 A、M，发现存在Ab，则更新M的first集 (b)
                            this.deepUpdateFirst(base, symbols, firstAndFollow)
                        }
                    }
                })
            }
        }
    }
    /**
     *  深度更新first集
     */
    private static deepUpdateFirst(base: string, symbols: Array<Array<string>>, firstAndFollow: Array<IFirstAndFollow>, target?: string) {
        let rest: string
        symbols.forEach(s => {
            for (let i = 1; i < s.length; i++) {
                // 找到以 base 开头且长度大于 base 的字符串
                if (s[i].startsWith(base) && s[i].length > base.length && s[i][base.length] !== alias) {
                    if (!target) {
                        target = s[0]
                    }
                    // 将 base 后的字符作为 rest
                    rest = s[i].replace(base, '')
                    // 如果 rest[0] 是终结符，那么更新 target 对应的 first
                    if (this.isTerminalSymbol(rest[0])) {
                        firstAndFollow.forEach(f => {
                            if (f.base === target && !f.first.includes(rest[0])) {
                                f.first.push(rest[0])
                            }
                        })
                    } else {
                        // 如果后面仍然是非终结符，则需要递归分析，更新first
                        //     M → AM | ε
                        //     A  → aM | ε
                        let headChar = rest[0], i = 0
                        while (rest[i + 1] === alias) {
                            headChar += alias
                            i++
                        }
                        const first = this.getUnterminalSymbolFirst(headChar, firstAndFollow)
                        firstAndFollow.forEach(f => {
                            if (f.base === target) {
                                f.first = this.combineFirst(f.first, first)
                            }
                        })
                        // 如果first包含空字符
                        if (first.includes(operator.EPSILON)) {
                            this.deepUpdateFirst(headChar, symbols, firstAndFollow, target)
                        }
                    }
                }
            }
        })
    }

    /**
     *  构造 First 集和 Follow 集
     * 
     *  Follow 集
     *  规则1： 加入#到FOLLOW(S)
     *  规则2： 若有产生式A→αBβ，则除ε外，FIRST(β)的全体加入到FOLLOW(B)
     *  规则3： 若有产生式A→αB或A→αBβ而ε∈FIRST(β)，则FOLLOW(A)的全体加入到FOLLOW(B)
     */
    private static createFirstAndFollow(symbols: Array<Array<string>>): Array<IFirstAndFollow> {
        // 根据规则 1 进行初始化
        const firstAndFollow = this.initFirstAndFollow(symbols)
        const unterminals: Array<IFollow> = [], temp = []
        // 遍历更新 First 集的非终结符
        for (let i = 0; i < firstAndFollow.length; i++) {
            // 如果 First 是非终结符, 则替换它
            const elem = firstAndFollow[i]
            for (let j = 0; j < elem.first.length; j++) {
                const firstSymbol = elem.first[j]
                // 判断首字母
                if (!this.isTerminalSymbol(firstSymbol[0])) {
                    const newFirst = this.getUnterminalSymbolFirst(firstSymbol, firstAndFollow)
                    elem.first.splice(j, 1)
                    elem.first = this.combineFirst(elem.first, newFirst)
                    // 回溯遍历
                    j = -1
                }
            }
            // first 集判断空字符是否应该存在
            this.updateFirstByEpsilon(firstAndFollow, symbols)
        }
        // 再次遍历更新 First 并生成 Follow 集
        for (let i = 0; i < firstAndFollow.length; i++) {
            const elem = firstAndFollow[i]
            for (let j = 0; j < elem.first.length; j++) {
                const firstSymbol = elem.first[j]
                // 判断首字母
                if (!this.isTerminalSymbol(firstSymbol[0])) {
                    const newFirst = this.getUnterminalSymbolFirst(firstSymbol, firstAndFollow)
                    elem.first.splice(j, 1)
                    elem.first = this.combineFirst(elem.first, newFirst)
                }
            }
            // 根据规则 2 获取 follow 集以及需要进行规则 3 的非终结符
            const [follow, map] = this.getUnterminalSymbolFollow(elem.base, symbols, firstAndFollow)
            elem.follow = elem.follow.concat(follow)
            map.length && temp.push(...map)
        }
        // 对象数组去重
        temp.forEach(elem => {
            const base = elem.base
            const target = elem.target
            if (!unterminals.some(s => s.base === base && s.target === target)) {
                unterminals.push(elem)
            }
        })
        // 根据规则 3 获取 follow 集
        for (let i = 0; i < unterminals.length; i++) {
            const follow = this.getFollowByFirstAndFollow(unterminals[i], firstAndFollow, unterminals)
            if (!follow.length) {
                continue
            }
            let isLoop = false
            firstAndFollow.forEach(elem => {
                if (elem.base === unterminals[i].base) {
                    const newFollow = [...new Set(elem.follow.concat(follow))]
                    if (elem.follow.length < newFollow.length) {
                        isLoop = true
                        elem.follow = newFollow
                    }
                }
            })
            if (isLoop) {
                i = -1
            }
        }
        return firstAndFollow
    }


    /**
     *  初始化预测分析表
     */
    private static initAnalysisTable(unterminalSymbols: Array<string>, terminalSymbols: Array<string>, result: AnalysisTable) {
        for (let i = 0; i < unterminalSymbols.length; i++) {
            const row: IAnalysisRow = { base: unterminalSymbols[i], to: [] }
            for (let j = 0; j < terminalSymbols.length; j++) {
                row.to[terminalSymbols[j]] = null
            }
            result.push(row)
        }
    }

    /**
     *  根据 first 获取以 first 开头的字符
     */
    private static getSymbolByFirst(first: string, symbols: Array<Array<string>>, index: number): string {
        const temp = []
        for (let i = 1; i < symbols[index].length; i++) {
            // 如果找到以 first 开头的字符，直接返回
            if (symbols[index][i].startsWith(first)) {
                return symbols[index][i]
            } else if (!this.isTerminalSymbol(symbols[index][i][0])) {
                // 如果是以非终结符开头，记录在 temp 中
                temp.push(symbols[index][i])
            }
        }
        // 如果 temp 中只有一个，直接返回
        if (temp.length === 1) {
            return temp[0]
        }
        // 如果不止一个，则需要判断 first 是在哪个非终结符中以首字母的形式存在
        // 通过递归调用实现
        temp.forEach(elem => {
            symbols.forEach((value, index) => {
                if (value[0] === elem) {
                    return this.getSymbolByFirst(first, symbols, index)
                }
            })
        })
        return NotFound
    }

    /**
     *  构造LL1预测分析表
     */
    private static createAnalysisTable(unterminalSymbols: Array<string>,
        terminalSymbols: Array<string>,
        firstAndFollow: Array<IFirstAndFollow>,
        symbols: Array<Array<string>>): [AnalysisTable, boolean] {
        let isMatchLL_1 = true
        const result: AnalysisTable = []
        // 将终结符中的 ε 移除并添加 #
        const newTerminalSymbols = terminalSymbols.filter(t => t !== operator.EPSILON)
        newTerminalSymbols.indexOf(operator.HASHTAG) === -1 && newTerminalSymbols.push(operator.HASHTAG)
        // 初始化分析表
        this.initAnalysisTable(unterminalSymbols, newTerminalSymbols, result)
        // 根据 first 和 follow 集进行构造
        firstAndFollow.forEach((elem, index) => {
            // temp 用于判断是否重复
            const temp = []
            elem.first.forEach(first => {
                if (first === operator.EPSILON) {
                    elem.follow.forEach(follow => {
                        temp.push(follow)
                        // 赋值 ε
                        result.forEach(r => {
                            if (elem.base === r.base) {
                                // 如果本身有值，则添加分隔符
                                if (!r.to[follow]) {
                                    r.to[follow] = operator.EPSILON
                                } else {
                                    r.to[follow] = r.to[follow] + ' / ' + operator.EPSILON
                                }
                            }
                        })
                    })
                } else {
                    temp.push(first)
                    // 赋值字符
                    let target = this.getSymbolByFirst(first, symbols, index)
                    // 如果字符不存在，则语法有误
                    if (target === NotFound) {
                        isMatchLL_1 = false
                    }
                    // 获取以 first 开头的字符
                    result.forEach(r => {
                        if (elem.base === r.base) {
                            // 如果本身有值，则添加分隔符
                            if (!r.to[first]) {
                                r.to[first] = target
                            } else {
                                r.to[first] = r.to[first] + ' / ' + target
                            }
                        }
                    })
                }
            })
            // 如果出现重复，则证明该语法不符合 LL（1）
            if (temp.some((value, index, array) => array.indexOf(value) !== index)) {
                isMatchLL_1 = false
            }
        })
        return [result, isMatchLL_1]
    }

    /**
     *  LL1外部接口调用
     */
    public static analysisByLL1(grammar: Array<string>): CFG {
        // 1.格式化输入语法
        const symbols = this.formatGrammar(grammar)
        // 2.消除左递归
        const withoutLeftRecursionSymbols = this.eliminateLeftRecursion(symbols)
        // 3.提取左因子
        const withoutLeftFactorSymbols = this.extractLeftFactor(withoutLeftRecursionSymbols)
        // 4.获取终结符和非终结符
        const [terminalSymbols, unterminalSymbols] = this.collectSymbols(withoutLeftFactorSymbols)
        // 5.构造 first 集和 follow 集
        const firstAndFollow = this.createFirstAndFollow(withoutLeftFactorSymbols)
        // 6.构造预测分析表
        const [analysisTable, isMatchLL_1] = this.createAnalysisTable(unterminalSymbols, terminalSymbols, firstAndFollow, withoutLeftFactorSymbols)
        const cfg = new CFG(grammar)
        cfg.setWithoutLeftRecursionSymbols(withoutLeftRecursionSymbols)
        cfg.setWithoutLeftFactorSymbols(withoutLeftFactorSymbols)
        cfg.setTerminalSymbols(terminalSymbols)
        cfg.setUnterminalSymbols(unterminalSymbols)
        cfg.setFirstAndFollow(firstAndFollow)
        cfg.setAnalysisTable(analysisTable)
        cfg.setIsMatchLL_1(isMatchLL_1)
        return cfg
    }

    /**
     *  初始化拓广文法
     */
    private static initExtentionGrammar(grammar: string[]): string[][] {
        const symbols = this.formatGrammar(grammar)
        if (!symbols) {
            return
        }
        const initialState = symbols[0][0]
        symbols.unshift([initialState + alias, initialState])
        return this.insertDot(symbols);
    }

    /**
     *  判断是否为 A → .B 待约项目
     */
    private static isPendingItem(item: string): boolean {
        let targetIndex = item.indexOf(dot) + 1
        if (targetIndex < item.length && isUpperCase(item[targetIndex])) {
            return true
        }
        return false
    }

    /**
     *  判断是否为 A → .b 移进项目
     */
    private static isMoveIntoItem(item: string): boolean {
        let targetIndex = item.indexOf(dot) + 1
        if (targetIndex < item.length && !isUpperCase(item[targetIndex])) {
            return true
        }
        return false
    }

    /**
     *  判断是否为 A → b. 归约项目 、 A → A. 接受项目
     */
    private static isReductionItemOrAcceptItem(item: string): boolean {
        let targetIndex = item.indexOf(dot) + 1
        if (targetIndex === item.length) {
            return true
        }
        return false
    }

    /**
     *  获取dot分隔符后面的字符
     */
    private static getNextCharByDot(item: string): string {
        return item.includes(dot) && item.indexOf(dot) + 1 < item.length && item[item.indexOf(dot) + 1]
    }

    /**
     *  根据待约项目获取目标拓广文法
     */
    private static getGrammarByPendingItem(extentionGrammar: string[][], target: string): string[] {
        const items: string[] = []
        extentionGrammar.forEach(elem => {
            if (elem[0] === target) {
                for (let i = 1; i < elem.length; i++) {
                    items.push(elem[0] + operator.ARROW + elem[i])
                }
            }
        })
        return items
    }

    /**
     *  根据拓广语法初始化活前缀DFA
     */
    private static initLivePrefixDFA(extentionGrammar: string[][], initailDfa: string[], id: number): ILivePrefixDFAItem {
        let initDFA: ILivePrefixDFAItem = { id: id, dfa: initailDfa, next: [] }
        for (let i = 0; i < initDFA.dfa.length; i++) {
            let item = initDFA.dfa[i]
            // 如果是待约项目，找到以目标字符开头的项目并添加进dfa中
            if (this.isPendingItem(item)) {
                let target: string = this.getNextCharByDot(item),
                    items: string[] = this.getGrammarByPendingItem(extentionGrammar, target)
                initDFA.dfa = unique(initDFA.dfa.concat(items))
            }
        }
        this.getLivePrefixDFANext(initDFA)
        return initDFA
    }

    /**
     *  获取活前缀 DFA 的 next 集合
     */
    private static getLivePrefixDFANext(livePrefixDFAItem: ILivePrefixDFAItem) {
        livePrefixDFAItem.dfa.forEach(dfaItem => {
            // 如果不是归约项目或接受项目,获取dot分隔符后面的字符并添加进next集合
            if (!this.isReductionItemOrAcceptItem(dfaItem)) {
                let nextChar = this.getNextCharByDot(dfaItem),
                    item = { nextChar: nextChar, toId: undefined }
                // 如果 next 集中不存在，则添加
                if (livePrefixDFAItem.next.every(e => e.nextChar !== nextChar)) {
                    livePrefixDFAItem.next.push(item)
                }
            }
        })
    }

    /**
     *  判断dfa的核状态是否已经存在
     */
    private static isExistCoreDFA(initailDfaArray: Array<IInitalDfa>, initailDfa: string[]): boolean {
        let isExist = false
        initailDfaArray.forEach(coreDFA => {
            if (initailDfa.every(elem => coreDFA.dfa.includes(elem))) {
                isExist = true
            }
        })
        return isExist
    }

    /**
     *  添加 DFA 的 toId 属性
     */
    private static formatToId(livePrefixDFAItems: Array<ILivePrefixDFAItem>, initailDfaArray: Array<IInitalDfa>) {
        livePrefixDFAItems.forEach(item => {
            // 遍历 next 添加 toId 属性
            item.next.forEach(elem => {
                // 遍历 initailDfaArray 获取 fromId 属性
                initailDfaArray.forEach(inital => {
                    // 找到包含当前 id 的 dfa, 把 dfa 的 id 作为 toId
                    if (inital.fromId.includes(item.id) && elem.nextChar === inital.preChar) {
                        elem.toId = inital.id
                    }
                })
            })
        })
    }

    /**
     *  构造文法识别活前缀的DFA
     */
    private static createLivePrefixDFA(extentionGrammar: string[][]): Array<ILivePrefixDFAItem> {
        let id = 0,
            // 记录 dfa 的核状态
            initailDfaArray: Array<IInitalDfa> = [],
            // 初始化文法识别活前缀DFA
            DFAItem: ILivePrefixDFAItem = this.initLivePrefixDFA(extentionGrammar, [extentionGrammar[0].join(operator.ARROW)], id++),
            // 初始化文法识别活前缀DFA集合
            livePrefixDFAItems: Array<ILivePrefixDFAItem> = [DFAItem];
        for (let i = 0; i < livePrefixDFAItems.length; i++) {
            let livePrefixDFAItem = livePrefixDFAItems[i]
            livePrefixDFAItem.next.forEach(to => {
                let initailDfa: string[] = [],
                    newDFAItem: ILivePrefixDFAItem
                livePrefixDFAItem.dfa.forEach(item => {
                    // 找到 toChar 对应的文法，如果不是归约项目或接受则将 dot 右移
                    if (this.getNextCharByDot(item) === to.nextChar && !this.isReductionItemOrAcceptItem(item)) {
                        let temp = item.replace(dot + to.nextChar, to.nextChar + dot)
                        initailDfa.push(temp)
                    }
                })
                // 判断dfa的核状态是否已经存在，若不存在则添加
                if (!this.isExistCoreDFA(initailDfaArray, initailDfa)) {
                    // 获取 dot 分隔符的前一个字符
                    let preCharIndex = initailDfa[0].indexOf(dot) - 1,
                        preChar = preCharIndex >= 0 ? initailDfa[0][preCharIndex] : null
                    initailDfaArray.push({ dfa: initailDfa, id: id, fromId: [livePrefixDFAItem.id], preChar: preChar })
                    newDFAItem = this.initLivePrefixDFA(extentionGrammar, initailDfa, id++)
                    this.getLivePrefixDFANext(newDFAItem)
                    livePrefixDFAItems.push(newDFAItem)
                } else {
                    for (let item of initailDfaArray) {
                        if (initailDfa.every(elem => item.dfa.includes(elem))) {
                            item.fromId.push(livePrefixDFAItem.id)
                            break
                        }
                    }
                }
            })
        }
        // 添加 DFA 的 toId 属性
        this.formatToId(livePrefixDFAItems, initailDfaArray)
        return livePrefixDFAItems
    }

    /**
     *  为拓广文法添加分隔符dot
     */
    private static insertDot(extentionGrammar: string[][]) {
        extentionGrammar.forEach(grammar => {
            for (let i = 1; i < grammar.length; i++) {
                if (grammar[i] === operator.EPSILON) {
                    grammar[i] = dot
                } else {
                    grammar[i] = dot + grammar[i]
                }
            }
        })
        return extentionGrammar
    }

    /**
     * 
     */
    private static createFirstAndFollowBySLR1(grammar: string[]): Array<IFirstAndFollow>  {
        // 1. 格式化输入语法
        const symbols = this.formatGrammar(grammar)
        // 2. 消除左递归
        const withoutLeftRecursionSymbols = this.eliminateLeftRecursion(symbols)
        // 3. SLR 构造 first 集和 follow 集
        const firstAndFollow = this.initFirstAndFollow(withoutLeftRecursionSymbols)
        const unterminals: Array<IFollow> = [], temp = []
        // 遍历更新 First 集的非终结符
        for (let i = 0; i < firstAndFollow.length; i++) {
            // 如果 First 是非终结符, 则替换它
            const elem = firstAndFollow[i]
            for (let j = 0; j < elem.first.length; j++) {
                const firstSymbol = elem.first[j]
                // 判断首字母
                if (!this.isTerminalSymbol(firstSymbol[0])) {
                    const newFirst = this.getUnterminalSymbolFirst(firstSymbol, firstAndFollow)
                    elem.first.splice(j, 1)
                    elem.first = this.combineFirst(elem.first, newFirst)
                    // 回溯遍历
                    j = -1
                }
            }
            // first 集判断空字符是否应该存在
            this.updateFirstByEpsilon(firstAndFollow, symbols)
        }
        // 再次遍历更新 First 并生成 Follow 集
        for (let i = 0; i < firstAndFollow.length; i++) {
            const elem = firstAndFollow[i]
            for (let j = 0; j < elem.first.length; j++) {
                const firstSymbol = elem.first[j]
                // 判断首字母
                if (!this.isTerminalSymbol(firstSymbol[0])) {
                    const newFirst = this.getUnterminalSymbolFirst(firstSymbol, firstAndFollow)
                    elem.first.splice(j, 1)
                    elem.first = this.combineFirst(elem.first, newFirst)
                }
            }
            // 根据规则 2 获取 follow 集以及需要进行规则 3 的非终结符
            const [follow, map] = this.getUnterminalSymbolFollow(elem.base, symbols, firstAndFollow)
            elem.follow = elem.follow.concat(follow)
            map.length && temp.push(...map)
        }
        // 对象数组去重
        temp.forEach(elem => {
            const base = elem.base
            const target = elem.target
            if (!unterminals.some(s => s.base === base && s.target === target)) {
                unterminals.push(elem)
            }
        })
        // 根据规则 3 获取 follow 集
        for (let i = 0; i < unterminals.length; i++) {
            const follow = this.getFollowByFirstAndFollow(unterminals[i], firstAndFollow, unterminals)
            if (!follow.length) {
                continue
            }
            let isLoop = false
            firstAndFollow.forEach(elem => {
                if (elem.base === unterminals[i].base) {
                    const newFollow = [...new Set(elem.follow.concat(follow))]
                    if (elem.follow.length < newFollow.length) {
                        isLoop = true
                        elem.follow = newFollow
                    }
                }
            })
            if (isLoop) {
                i = -1
            }
        }
        return firstAndFollow
    }

    /**
    *  SLR1外部接口调用
    */
    public static analysisBySLR1(grammar: string[]): CFG {
        // 1. 初始化拓广文法
        const extentionGrammar = this.initExtentionGrammar(grammar);
        // 2. 构造文法识别活前缀的DFA
        const livePrefixDFA = this.createLivePrefixDFA(extentionGrammar);
        // 3. 调用实验二接口找出非终结符的 first 和 follow 集
        const firstAndFollow = this.createFirstAndFollowBySLR1(grammar).filter(elem => !elem.base.includes(alias))
        const cfg = new CFG(grammar)
        cfg.setExtentionGrammar(extentionGrammar)
        cfg.setLivePrefixDFA(livePrefixDFA)
        cfg.setFirstAndFollow(firstAndFollow)
        return cfg
    }

}

export default Analysis
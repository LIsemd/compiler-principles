import CFG, { IFirstAndFollow, AnalysisTable, IResult, ILivePrefixDFAItem } from './libs/CFG';
import DFA from './libs/DFA'
import NFA from './libs/NFA'
import State from './libs/State'
import _RegExp from './libs/RegExp'
import { operator } from './enum/operator'
import Analysis from './libs/Analysis'
import { filterInvisibleChar, initElements } from './utils/until'

/************************** 实验一： 正规式 -> 最小DFA **************************/
const inputElement_1 = <HTMLInputElement>document.getElementById('expression-input')
const buttonElement_1 = document.getElementById('expression-btn')

buttonElement_1.addEventListener('click', () => {
    const expression = inputElement_1.value
    if (!expression) {
        alert('请输入一个正规式')
        return
    }
    try {
        const exp = _RegExp.translate(expression)
        const nfa = NFA.buildNFA(exp)
        const nfaStack = NFA.buildNFAStack(nfa)
        printNFA(nfaStack)
        const dfaStack = DFA.buildDFA(nfaStack)
        printDFA(dfaStack)
        const minDFAStack = DFA.simplify(dfaStack)
        printMinDFA(minDFAStack)
    } catch (error) {
        alert('输入的表达式有误')
        console.log('error :', error);
    }
})

const printNFA = (nfaStack: State[]) => {
    const nfaTableHeader = document.getElementById('nfa-table-header')
    const nfaTableMain = document.getElementById('nfa-table-main')
    printTable(nfaStack, nfaTableHeader, nfaTableMain, true)
}

const printDFA = (dfaStack: State[]) => {
    const dfaTableHeader = document.getElementById('dfa-table-header')
    const dfaTableMain = document.getElementById('dfa-table-main')
    printTable(dfaStack, dfaTableHeader, dfaTableMain)
}

const printMinDFA = (minDFAStack: State[]) => {
    const minDFATableHeader = document.getElementById('min-dfa-table-header')
    const minDFATableMain = document.getElementById('min-dfa-table-main')
    printTable(minDFAStack, minDFATableHeader, minDFATableMain)
}

const printTable = (stack: State[], tableHeaderDom: HTMLElement, tableMainDom: HTMLElement, isNFA: boolean = false) => {
    // 创建空节点
    const tableHeader = document.createDocumentFragment()
    const tableRows = document.createDocumentFragment()
    // 删除原先的子节点
    initElements(tableHeaderDom, tableMainDom)
    // 记录所有的转移
    const transitions = {}
    stack.forEach(state => {
        for (let key in state.transition) {
            if (!transitions[key]) {
                transitions[key] = true
            }
        }
    })
    if (isNFA) {
        transitions['ε'] = true
    }
    // 初始化表格头部
    const th_0 = document.createElement('th')
    th_0.innerText = 'ID'
    tableHeader.appendChild(th_0)
    for (let key in transitions) {
        const th = document.createElement('th')
        th.innerText = key
        tableHeader.appendChild(th)
    }
    tableHeaderDom.appendChild(tableHeader)

    // 初始化表格主体
    stack.forEach(state => {
        const tableRow = document.createElement('tr')
        const tableData_0 = document.createElement('td')
        // ID
        tableData_0.innerText = state.id.toString()
        if (state.isStart) {
            tableData_0.className += 'start '
        }
        if (state.isEnd) {
            tableData_0.className += 'end '
        }
        tableRow.appendChild(tableData_0)
        // 转移
        for (let key in transitions) {
            const tableData = document.createElement('td')
            let temp = []
            if (isNFA) {
                if (state.transition[key]) {
                    state.transition[key].forEach(elem => {
                        temp.push(elem.id)
                    })
                    tableData.innerText = temp.join('、')
                } else if (key === operator.EPSILON && state.epsilonTransition.length) {
                    // 空转移
                    state.epsilonTransition.forEach(elem => {
                        temp.push(elem.id)
                    })
                    tableData.innerText = temp.join('、')
                }
            } else {
                if (state.transition[key] !== undefined) {
                    tableData.innerText = state.transition[key].toString()
                }
            }

            tableRow.appendChild(tableData)
        }
        tableRows.appendChild(tableRow)
    })
    tableMainDom.appendChild(tableRows)
}

/************************** 实验二：LL1语法分析 **************************/

const buttonElement_2 = <HTMLInputElement>document.getElementById('file-cfg')
const buttonElement_3 = <HTMLInputElement>document.getElementById('file-sentence')
const inputLabelElement_cfg = <HTMLInputElement>document.getElementById('input-label-cfg')
const inputLabelElement_sentence = <HTMLInputElement>document.getElementById('input-label-sentence')
const inputGrammarElement = document.getElementById('input-grammar')
const outputGrammarElement_1 = document.getElementById('output-grammar-1')
const outputGrammarElement_2 = document.getElementById('output-grammar-2')
const tableHeader = document.getElementById('ff-table-header')
const tableMain = document.getElementById('ff-table-main')

let cfg: CFG
buttonElement_2.addEventListener('change', () => {
    const filesList = buttonElement_2.files;
    if (!filesList.length) {
        return
    }
    // 初始化
    initElements(inputGrammarElement, outputGrammarElement_1, outputGrammarElement_2)
    readFile(filesList[0], inputLabelElement_cfg).then((value: string) => {
        value = filterInvisibleChar(value)
        const grammar = value.split('\n').filter(v => v)
        try {
            // console.time("本次生成预测分析表所需时间：")
            cfg = Analysis.analysisByLL1(grammar)
            // console.timeEnd("本次生成预测分析表所需时间：")
            const withoutLeftRecursionSymbols = cfg.getWithoutLeftRecursionSymbols()
            const withoutLeftFactorSymbols = cfg.getWithoutLeftFactorSymbols()
            const firstAndFollow = cfg.getFirstAndFollow()
            const analysisTable = cfg.getAnalysisTable()
            const isMatchLL1 = cfg.getIsMatchLL_1()
            printGrammar(grammar, inputGrammarElement)
            printOutputGrammar(withoutLeftRecursionSymbols, outputGrammarElement_1)
            printOutputGrammar(withoutLeftFactorSymbols, outputGrammarElement_2)
            printFirstAndFollow(firstAndFollow, tableHeader, tableMain)
            printAnalysisTable(analysisTable)
            printIsMatchLL1(isMatchLL1)
        } catch (error) {
            alert('输入文法有误')
        }
    }).then(() => {
        buttonElement_2.value = ''
    })
})

buttonElement_3.addEventListener('change', () => {
    if (!cfg) {
        alert('请先选择文法文件')
        return
    }
    if (!cfg.getIsMatchLL_1()) {
        alert('该文法不符合LL1，请重新选择')
        return
    }
    const filesList = buttonElement_3.files;
    if (!filesList.length) {
        return
    }
    readFile(filesList[0], inputLabelElement_sentence).then((sentence: string) => {
        sentence = filterInvisibleChar(sentence)
        console.time("本次语法分析所需时间：")
        cfg.test(sentence, 'LL1')
        console.timeEnd("本次语法分析所需时间：")
        const res = cfg.getResult()
        printAnalysisProcess(res)
    }).then(() => {
        buttonElement_3.value = ''
    })
})

/**
 *  读取文件
 */
const readFile = (file: File, labelElement: HTMLInputElement) => {
    labelElement.innerText = file.name
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = function () {
            resolve(reader.result)
        }
        reader.readAsText(file)
    })
}

/**
 *  输出是否符合LL1
 */
const printIsMatchLL1 = (isMatch: boolean) => {
    const isMatchLL1 = document.getElementById('isMatchLL1')
    if (isMatch) {
        isMatchLL1.innerText = '该语法符合LL(1)'
        isMatchLL1.classList.remove('error')
        isMatchLL1.classList.add('success')
    } else {
        isMatchLL1.innerText = '该语法不符合LL(1)'
        isMatchLL1.classList.remove('success')
        isMatchLL1.classList.add('error')
    }
}

/**
 *  打印文法
 */
const printGrammar = (grammar: Array<string>, element: HTMLElement) => {
    const list = document.createDocumentFragment();
    grammar.forEach(line => {
        const li = document.createElement('li')
        li.innerText = line.split(operator.ARROW).join(' ' + operator.ARROW + ' ')
            .split(operator.UNION).join(' ' + operator.UNION + ' ')
        list.appendChild(li)
    })
    element.appendChild(list)
}

/**
 *  打印 first 和 follw 集
 */
const printFirstAndFollow = (firstAndFollow: IFirstAndFollow[], tableHeader: HTMLElement, tableMain: HTMLElement) => {
    initElements(tableHeader, tableMain)
    tableHeader.innerHTML = `<td class="table-cell table-cell-first"></td>
                            <td class="table-cell">First</td>
                            <td class="table-cell">Follow</td>`;
    const fragment = document.createDocumentFragment()
    firstAndFollow.forEach(f => {
        const tr = document.createElement('tr')
        tr.classList.add('table-row')
        for (let key in f) {
            const td = document.createElement('td')
            for (let char of f[key]) {
                td.innerText +=  ` ${char} `
            }
            if (key === 'base') {
                td.classList.add('table-cell-first')
            }
            td.classList.add('table-cell')
            tr.appendChild(td)
        }
        fragment.appendChild(tr)
    })
    tableMain.appendChild(fragment)
}

/**
 *  打印输出文法
 */
const printOutputGrammar = (grammar: Array<Array<string>>, element: HTMLElement) => {
    const newGrammar = splicingGrammar(grammar)
    printGrammar(newGrammar, element)
}

/**
 *  拼接文法字符串
 */
const splicingGrammar = (grammar: Array<Array<string>>) => {
    const result = []
    grammar.forEach(arr => {
        let str = arr.join(operator.UNION)
        const arrowIndex = str.indexOf(operator.UNION)
        str = str.replace(str[arrowIndex], operator.ARROW)
        result.push(str)
    })
    return result
}

/**
 *  打印预测分析表
 */
const printAnalysisTable = (analysisTable: AnalysisTable) => {
    const tableHeader = document.getElementById('analysis-table-header')
    const tableMain = document.getElementById('analysis-table-main')
    initElements(tableHeader, tableMain)
    const fragment_h = document.createDocumentFragment()
    const fragment = document.createDocumentFragment()
    analysisTable.forEach((elem, index) => {
        if (index === 0) {
            const td = document.createElement('td')
            td.classList.add('table-cell-first')
            td.classList.add('table-cell')
            fragment_h.appendChild(td)
            for (let key in elem.to) {
                const td = document.createElement('td')
                td.classList.add('table-cell')
                td.innerText = key
                fragment_h.appendChild(td)
            }
        }
        const tr = document.createElement('tr')
        tr.classList.add('table-row')
        const base = document.createElement('td')
        base.classList.add('table-cell-first')
        base.classList.add('table-cell')
        base.innerText = elem.base
        tr.appendChild(base)
        for (let key in elem.to) {
            const td = document.createElement('td')
            td.classList.add('table-cell')
            td.innerText = elem.to[key]
            tr.appendChild(td)
        }
        fragment.appendChild(tr)
    })
    tableHeader.appendChild(fragment_h)
    tableMain.appendChild(fragment)
}

/**
 *  打印分析过程
 */
const printAnalysisProcess = (result: IResult[]) => {
    const tableHeader = document.getElementById('process-table-header')
    const tableMain = document.getElementById('process-table-main')
    initElements(tableHeader, tableMain)
    tableHeader.innerHTML = `<td class="table-cell">符号栈</td>
                            <td class="table-cell">当前输入符号</td>
                            <td class="table-cell">输入串</td>
                            <td class="table-cell">输入串</td>`;
    const fragment = document.createDocumentFragment()
    result.forEach(row => {
        const tr = document.createElement('tr')
        tr.classList.add('table-row')
        for (let key in row) {
            const td = document.createElement('td')
            td.innerText = row[key]
            td.classList.add('table-cell')
            tr.appendChild(td)
        }
        fragment.appendChild(tr)
    })
    tableMain.appendChild(fragment)
}

/************************** 实验三：SLR1语法分析 **************************/

// S → A
// A → Ab | bBa
// B → aAc | a | aAb
const buttonElement_4 = <HTMLInputElement>document.getElementById('file-cfg2')
const inputLabelElement_cfg2 = <HTMLInputElement>document.getElementById('input-label-cfg2')
const inputGrammar2Element = document.getElementById('input-grammar-2')
const extentionGrammarElement = document.getElementById('extention-grammar')
const livePrefixHeader = document.getElementById('livePrefix-header')
const livePrefixMain = document.getElementById('livePrefix-main')
const tableHeader2 = document.getElementById('ff-table-header-2')
const tableMain2 = document.getElementById('ff-table-main-2')
buttonElement_4.addEventListener('change', _ => {
    const filesList = buttonElement_4.files;
    if (!filesList.length) {
        return
    }
    // 初始化
    initElements(inputGrammar2Element, extentionGrammarElement)
    readFile(filesList[0], inputLabelElement_cfg2).then((value: string) => {
        value = filterInvisibleChar(value)
        const grammar = value.split('\n').filter(v => v)
        try {
            cfg = Analysis.analysisBySLR1(grammar)
            const extentionGrammar = cfg.getExtentionGrammar()
            const livePrefix = cfg.getLivePrefixDFA()
            const firstAndFollow = cfg.getFirstAndFollow()
            printGrammar(grammar, inputGrammar2Element)
            printLivePrefix(livePrefix, livePrefixHeader, livePrefixMain)
            printOutputGrammar(extentionGrammar, extentionGrammarElement)
            printFirstAndFollow(firstAndFollow, tableHeader2, tableMain2)
            console.log('cfg :>> ', cfg);
        } catch (error) {
            alert('输入文法有误')
            console.log('error :>> ', error);
        }
    }).then(() => {
        buttonElement_4.value = ''
    })
})

/**
 *  打印文法活前缀DFA
 */
const printLivePrefix = (livePrefix: ILivePrefixDFAItem[], tableHeader: HTMLElement, tableMain: HTMLElement) => {
    initElements(tableHeader, tableMain)
    tableHeader.innerHTML = `<td class="table-cell table-cell-first">ID</td>
                            <td class="table-cell">DFA</td>
                            <td class="table-cell">备注</td>`;
    const fragment = document.createDocumentFragment()
    livePrefix.forEach(item => {
        const tr = document.createElement('tr')
        tr.classList.add('table-row')
        for (let key in item) {
            const td = document.createElement('td')
            td.classList.add('table-cell')
            if (key === 'id') {
                td.classList.add('table-cell-first')
                td.innerHTML = `I<span style="font-size: 8px!important">${item[key]}</span>`
            } else if (key === 'dfa') {
                td.innerHTML = ''
                item.dfa.forEach(e => {
                    td.innerHTML += `${e}<br/>`
                })
            } else {
                td.innerHTML = ''
                item.next.forEach(e => {
                    td.innerHTML += `通过 <span style="color: red">${e.nextChar}</span> 到达 I<span style="font-size: 8px!important">${e.toId}</span><br/>` 
                })
            }
            tr.appendChild(td)
        }
        fragment.appendChild(tr)
    })
    tableMain.appendChild(fragment)
}
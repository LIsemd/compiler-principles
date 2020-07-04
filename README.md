## **《 编译原理实验 》** —— 软件工程2班 李佳煜 1715251018

> 正规式 -----> NFA -----> DFA -----> MinDFA

---

### **实验介绍：**
1. 使用 Thompson 算法： 从正则表达式到 NFA
2. 使用子集构造法： 从 NFA 到 DFA
3. 使用子集划分法： 从 DFA 到最小 DFA

---

### **实验难点分析：**
1. 在构建后缀表达式前，需要为正规式添加连接符号，确保后续操作正常进行
2. 在设计 State 数据结构时，需要在后续不断完善才能满足要求
3. 在添加转移时，需要考虑到 DFA 可能需要的操作，因此要使用数组的结构
4. 在构建 NFA 时，使用深度优先遍历来返回一个节点数组，同时需要对每一个节点进行命名操作
5. 在构建 DFA 时，需要递归获取节点的空闭包和新节点的核状态，其中涉及到较为复杂的去重操作
6. 在构建 DFA 时，最终的结果应该能充分描述 DFA 的结构，因此需要额外的数据类型来支持，此外还需要对 DFA 进行重命名操作
7. 在最小化 DFA 时, 进行子集划分法需要确认当前节点的所属组别，存在处理困难的情况

---

### **算法流程说明：**
1. 给正规式中添加连接符号
2. 将中缀表达式转换为后缀表达式
3. 根据后缀表达式构建 NFA
4. 根据 NFA 构建 DFA
5. 根据 DFA 构建最小化 DFA 

---

### **程序详细说明：**

#### **项目结构**

    --- dist  // 打包路径

    ------ main.js  // 压缩代码

    --- node_modules  // 外部依赖

    --- src  // 项目主路径

    ------ css   // 样式文件

    ------ enum   // 常量配置

    ------ libs   // 主路径

    --------- DFA.ts  // DFA 操作类

    --------- NFA.ts  // NFA 操作类

    --------- RegExp.ts  // 正规式操作类

    --------- State.ts  // 节点状态类

    ------ utils  // 工具函数文件

    ------ index.html  // 页面文件

    ------ index.ts   // 打包入口文件

    --- test  // 测试文件目录

    --- package.json  // 依赖配置文件

    --- tsconfig.json  // typescript 配置文件

    --- webpack.config.js  // webpack 配置文件

#### **使用说明**

本实验使用 TypeScript + Webpack 进行项目代码开发，打开 src 目录下的 index.html 文件即可测试实验代码

测试代码放置于控制台，打开浏览器控制台输出处可见

#### **测试数据及结果** （ Node.js 环境 ）
> (a\*|b\*)\*

```js
****************** NFA ******************

NFA {
  startNode: State {
    isStart: true,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 0,
    isVisited: true
  },
  endNode: State {
    isStart: false,
    isEnd: true,
    transition: {},
    epsilonTransition: [],
    id: 7,
    isVisited: true
  }
}

************** NFA Stack ****************

[
  State {
    isStart: true,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 0,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 1,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 2,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { a: [Array] },
    epsilonTransition: [],
    id: 3,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 4,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 5,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 6,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: true,
    transition: {},
    epsilonTransition: [],
    id: 7,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 8,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { b: [Array] },
    epsilonTransition: [],
    id: 9,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 10,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 11,
    isVisited: true
  }
]

************** DFA Stack ****************

[
  State {
    isStart: true,
    isEnd: true,
    transition: { a: 1, b: 2 },
    epsilonTransition: [],
    oldStateIdArray: [
      0, 1, 2, 3,  5,
      6, 7, 8, 9, 11
    ],
    coreState: [ 0 ],
    id: 0
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { a: 1, b: 2 },
    epsilonTransition: [],
    oldStateIdArray: [
      1, 2, 3, 4,  5,
      6, 7, 8, 9, 11
    ],
    coreState: [ 4 ],
    id: 1
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { b: 2, a: 1 },
    epsilonTransition: [],
    oldStateIdArray: [
      1, 2, 3,  5,  6,
      7, 8, 9, 10, 11
    ],
    coreState: [ 10 ],
    id: 2
  }
]

************** MinDFA ****************

[
  State {
    isStart: true,
    isEnd: true,
    transition: { a: 0, b: 0 },
    oldStateIdArray: [ 0, 1, 2 ],
    id: 0
  }
]
```

---

> (0|1)\*011(0|1)\*

```js
****************** NFA ******************

NFA {
  startNode: State {
    isStart: true,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 0,
    isVisited: true
  },
  endNode: State {
    isStart: false,
    isEnd: true,
    transition: {},
    epsilonTransition: [],
    id: 17,
    isVisited: true
  }
}

************** NFA Stack ****************

[
  State {
    isStart: true,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 0,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 1,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': [Array] },
    epsilonTransition: [],
    id: 2,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 3,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 4,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 5,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': [Array] },
    epsilonTransition: [],
    id: 6,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 7,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '1': [Array] },
    epsilonTransition: [],
    id: 8,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 9,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '1': [Array] },
    epsilonTransition: [],
    id: 10,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 11,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 12,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 13,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': [Array] },
    epsilonTransition: [],
    id: 14,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 15,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State], [State] ],
    id: 16,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: true,
    transition: {},
    epsilonTransition: [],
    id: 17,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '1': [Array] },
    epsilonTransition: [],
    id: 18,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 19,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '1': [Array] },
    epsilonTransition: [],
    id: 20,
    isVisited: true
  },
  State {
    isStart: false,
    isEnd: false,
    transition: {},
    epsilonTransition: [ [State] ],
    id: 21,
    isVisited: true
  }
]

************** DFA Stack ****************

[
  State {
    isStart: true,
    isEnd: false,
    transition: { '0': 1, '1': 8 },
    epsilonTransition: [],
    oldStateIdArray: [ 0, 1, 2, 5, 6, 20 ],
    coreState: [ 0 ],
    id: 0
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': 1, '1': 2 },
    epsilonTransition: [],
    oldStateIdArray: [
      1, 2, 3,  4, 5,
      6, 7, 8, 20
    ],
    coreState: [ 3, 7 ],
    id: 1
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': 1, '1': 3 },
    epsilonTransition: [],
    oldStateIdArray: [
      1,  2,  4,  5, 6,
      9, 10, 20, 21
    ],
    coreState: [ 9, 21 ],
    id: 2
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 4, '1': 7 },
    epsilonTransition: [],
    oldStateIdArray: [
       1,  2,  4,  5,  6, 11,
      12, 13, 14, 17, 18, 20,
      21
    ],
    coreState: [ 11, 21 ],
    id: 3
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 4, '1': 5 },
    epsilonTransition: [],
    oldStateIdArray: [
       1,  2,  3,  4,  5,  6,
       7,  8, 13, 14, 15, 16,
      17, 18, 20
    ],
    coreState: [ 3, 7, 15 ],
    id: 4
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 4, '1': 6 },
    epsilonTransition: [],
    oldStateIdArray: [
       1,  2,  4,  5,  6,  9,
      10, 13, 14, 16, 17, 18,
      19, 20, 21
    ],
    coreState: [ 9, 19, 21 ],
    id: 5
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 4, '1': 7 },
    epsilonTransition: [],
    oldStateIdArray: [
       1,  2,  4,  5,  6, 11,
      12, 13, 14, 16, 17, 18,
      19, 20, 21
    ],
    coreState: [ 11, 19, 21 ],
    id: 6
  },
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 4, '1': 7 },
    epsilonTransition: [],
    oldStateIdArray: [
       1,  2,  4,  5,  6, 13,
      14, 16, 17, 18, 19, 20,
      21
    ],
    coreState: [ 19, 21 ],
    id: 7
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': 1, '1': 8 },
    epsilonTransition: [],
    oldStateIdArray: [
      1,  2,  4, 5,
      6, 20, 21
    ],
    coreState: [ 21 ],
    id: 8
  }
]

************** MinDFA ****************

[
  State {
    isStart: false,
    isEnd: true,
    transition: { '0': 0, '1': 0 },
    oldStateIdArray: [ 3, 4, 5, 6, 7 ],
    id: 0
  },
  State {
    isStart: true,
    isEnd: false,
    transition: { '0': 3, '1': 1 },
    oldStateIdArray: [ 0, 8 ],
    id: 1
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': 3, '1': 0 },
    oldStateIdArray: [ 2 ],
    id: 2
  },
  State {
    isStart: false,
    isEnd: false,
    transition: { '0': 3, '1': 2 },
    oldStateIdArray: [ 1 ],
    id: 3
  }
]
```



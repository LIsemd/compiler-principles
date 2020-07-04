// 描述节点状态类
class State {
    
    id: number                              // ID
    isStart: boolean                        // 初态
    isEnd: boolean                          // 终态
    isVisited: boolean                      // 访问情况
    transition: { [key: string]: State[] }  // 转移
    epsilonTransition: State[]              // 空转移
    oldStateIdArray: Number[]               // 原 NFA 中的节点 ID
    coreState: Number[]                     // 核状态


    constructor(isStart: boolean = false, isEnd: boolean = false) {
        this.isStart = isStart
        this.isEnd = isEnd
        this.transition = {}
        this.epsilonTransition = []
    }

    /**
     *  添加转移
     */
    public addTransition(token: string, to: State[]): State {
        // 如果已存在，则叠加 State
        if (this.transition[token]) {
            this.transition[token] = this.transition[token].concat(to)
        } else {
            this.transition[token] = to;            
        }
        return this;
    }

    /**
     *  添加空转移
     */
    public addEpsilonTransition(to: State): State {
        this.epsilonTransition.push(to);
        return this;
    }

    /**
     *  设置 ID
     */
    public setId(id: number) {
        this.id = id
        return this
    }

    /**
     *  访问节点
     */
    public visit() {
        this.isVisited = true
        return this
    }

    /**
     *  设置核状态
     */
    public setCoreState(coreState: Number[]) {
        this.coreState = coreState
        return this
    }


    /**
     *  设置旧节点 ID
     */
    public setOldStateId(oldStateIdArray: Number[]) {
        this.oldStateIdArray = oldStateIdArray
        return this
    }
}

export default State
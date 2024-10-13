import {
    findClosestByPath,
    findClosestByRange,
    findInRange,
    findPath,
    getObjectById,
    getObjectsByPrototype,
    getRange,
    getTicks
} from "game/utils";
import {
    Creep,
    GameObject,
    GameObjectConstructor,
    RoomPosition,
    Source,
    StructureContainer,
    StructureSpawn
} from "game/prototypes";
import {
    ATTACK,
    CARRY,
    ERR_NOT_IN_RANGE,
    HEAL_POWER,
    MOVE,
    RANGED_ATTACK,
    HEAL,
    RESOURCE_ENERGY,
    RIGHT,
    TOUGH,
    WORK,
    BOTTOM,
    BodyPartConstant
} from "game/constants";
import { CLIENT_RENEG_LIMIT } from "tls";
import { findSourceMap } from "module";
import { close, futimesSync, stat } from "fs";
import { FindPosition, Position } from "source-map";
import { errorMonitor } from "events";
import { BodyPart } from "arena";
import { moveMessagePortToContext } from "worker_threads";

let maxFarmer = 3; // 农民数量
let maxAtacker = 50; // 战士数量
let maxRangeAttacker = 0; // 弓箭手数量
let maxHealer = 0; // 牧师数量

let farmerList: Creep[] = [];
let attackerList: Creep[] = [];
let rangerList: Creep[] = [];
let healerList: Creep[] = [];

enum CreepStatus {
    normal = "蹲草",
    attack = "全军出击",
    back = "回防高地",
    default = "默认"
}
enum CreateCreepSituation {
    createFarmer = "创建农民",
    createAttacker = "创建近战兵",
    createRanger = "创建远程兵",
    createHealer = "创建医疗兵",
    freeze = "什么都不做"
}
let status = CreepStatus.normal;

let spawn = getObjectsByPrototype(StructureSpawn).find(i => i.my)!;
let enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my)!;
// 计算屯兵位置
let creepStopPosition = getOneThirdPosition(spawn, enemySpawn);
// 保存最近的三个能量容器
let myContainers: StructureContainer[] = [];
let enemyContainers: StructureContainer[] = [];
let allContainers: StructureContainer[] = getObjectsByPrototype(StructureContainer).filter(i => Number(i.store) > 0);
if (spawn.id == "4") {
    myContainers = getObjectsByPrototype(StructureContainer).filter(i => i.id < "5");
    enemyContainers = getObjectsByPrototype(StructureContainer).filter(i => i.id > "5");
} else {
    myContainers = getObjectsByPrototype(StructureContainer).filter(i => i.id > "5");
    enemyContainers = getObjectsByPrototype(StructureContainer).filter(i => i.id < "5");
}

// 通过给定的起始对象和终点对象，返回从起始点到终点路径的三分之一处
export function getOneThirdPosition(fromPos: StructureSpawn, toPos: StructureSpawn) {
    let path = findPath(fromPos, toPos);
    if (path.length < 3) {
        return { x: fromPos.x, y: fromPos.y };
    }
    return path[Math.round(path.length / 3)];
}

// 获取还活着的爬虫
export function getAliveCreep(creeps: Creep[]) {
    let aliveCreeps = [];
    for (let creep of creeps) {
        if (creep && creep.id && creep.hits) {
            aliveCreeps.push(creep);
        }
    }
    return aliveCreeps;
}

// 获取已经死亡的爬虫
export function getDeadCreep(creeps: Creep[]) {
    let deadCreeps = [];
    for (let creep of creeps) {
        if (creep && creep.id && !creep.hits) {
            deadCreeps.push(creep);
        }
    }
    return deadCreeps;
}

// 判断当前局势，创建对应的爬虫
export function judgeCreateCreepSituation(): CreateCreepSituation {
    let aliveFarmers = getObjectsByPrototype(Creep).filter(i => i.my && i.hits);
    let enemyScreeps = getObjectsByPrototype(Creep).filter(i => !i.my && i.hits);
    let closestEnemyToMyPawn = findClosestByRange(spawn, enemyScreeps);
    // 计算最接近基地敌方单位到基地的距离（直线）
    let tmpClosestDis = 1000;
    if (closestEnemyToMyPawn) {
        tmpClosestDis = getRange(spawn, closestEnemyToMyPawn);
    }

    // 农民没有达到最大值，并且附近没有敌人，就一直造农民
    if (aliveFarmers.length < maxFarmer && tmpClosestDis > 10) return CreateCreepSituation.createFarmer;

    let needHealerNum = rangerList.length / 2;
    if (needHealerNum < healerList.length) {
        return CreateCreepSituation.createHealer;
    }

    // if (attackerList.length > 5) {
    //     // 计算远程兵和近战兵的分配数量（向下取整）
    //     let needRangerNum: number = Math.ceil(attackerList.length / 5);
    //     let needHealerNum: number = Math.ceil(attackerList.length / 8);

    //     if (rangerList.length < needRangerNum) return CreateCreepSituation.createRanger;
    //     if (healerList.length < needHealerNum) return CreateCreepSituation.createHealer;
    // }

    return CreateCreepSituation.createRanger; // 默认生成远程兵
    // return CreateCreepSituation.freeze
}

// 创建爬虫
export function createCreeps() {
    let situation = judgeCreateCreepSituation();
    console.log("爬虫创建状态：" + situation);
    if (situation == CreateCreepSituation.createFarmer) {
        // 创建农民
        let creep = spawn.spawnCreep([CARRY, CARRY, MOVE, MOVE]).object;
        // 创建成功就添加到农民列表中
        if (creep) farmerList.push(creep);
    } else if (situation == CreateCreepSituation.createAttacker) {
        // 创建近战兵
        let creep = spawn.spawnCreep([MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK]).object;
        if (creep) attackerList.push(creep);
    } else if (situation == CreateCreepSituation.createRanger) {
        let creep = spawn.spawnCreep([
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            RANGED_ATTACK,
            RANGED_ATTACK
        ]).object;
        if (creep) rangerList.push(creep);
    } else if (situation == CreateCreepSituation.createHealer) {
        let creep = spawn.spawnCreep([MOVE, MOVE, MOVE, MOVE, MOVE, HEAL]).object;
        if (creep) healerList.push(creep);
    } else {
        return;
    }
}

// 移动远离
export function moveAway(a: Creep, b: RoomPosition) {
    // 注意：findPath 获取到的路径的第0项，是Creep当前位置的下一个点位
    let nextPos = findPath(a, b)[0];
    // 计算移动到下一步x和y的变化量
    let stepX = nextPos.x - a.x;
    let stepY = nextPos.y - a.y;
    // 用当前位置减去上面的变化量，就能得到反方向的下一步
    let awayPos = <RoomPosition>{ x: a.x - stepX, y: a.y - stepY };
    a.moveTo(awayPos);
}

// 搬运能量
export function carryEnergy(containers: StructureContainer[]) {
    for (let i = 0; i < farmerList.length; i++) {
        let creep = farmerList[i];
        if (!creep.hits) {
            continue;
        }
        allContainers = getObjectsByPrototype(StructureContainer).filter(i => i.store.energy);
        let container = findClosestByPath(creep, allContainers);
        // console.log("choice container", container)
        // console.log("all container length", allContainers.length)
        if (creep.store[RESOURCE_ENERGY] == 0) {
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container);
            }
        } else {
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }
}

// 状态：屯兵点待命
export function statusNormal(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {
    for (let i = 0; i < attackerList.length; i++) {
        let creep = attackerList[i];
        if (!creep.hits) {
            continue;
        }

        let closeEnemy = findClosestByPath(creep, enemys);
        if (closeEnemy) {
            if (creep.attack(closeEnemy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creepStopPosition);
            } else {
                creep.moveTo(closeEnemy);
            }
        } else {
            creep.moveTo(creepStopPosition);
        }
    }

    // 出现减员就切换为全军出击，一波冲烂对面
    if (deadMy.length > 0) {
        status = CreepStatus.attack;
    }
}

// 近战兵种的攻击方式
export function attackerAttack(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {
    for (let i = 0; i < attackerList.length; i++) {
        let creep = attackerList[i];

        // 已经死亡的爬虫就不要遍历了，会报错
        if (!creep.hits) {
            continue;
        }

        let closeEnemy = findClosestByPath(creep, enemys);
        let rangeEnemy = 1000;
        // 过滤掉已经死亡的敌人
        if (closeEnemy && closeEnemy.hits) {
            rangeEnemy = getRange(creep, closeEnemy);
        }
        let rangeSpawn = getRange(creep, enemySpawn);

        // 解决敌人和敌人基地重叠的问题
        // 如果重叠，那就不攻击敌人，而是攻击基地
        if (closeEnemy && rangeEnemy == rangeSpawn && closeEnemy.x == enemySpawn.x && closeEnemy.y == enemySpawn.y) {
            rangeEnemy += 1;
        }
        console.log(creep.id, rangeEnemy, rangeSpawn);
        if (closeEnemy && rangeEnemy <= rangeSpawn) {
            if (creep.attack(closeEnemy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closeEnemy);
            }
        } else {
            if (creep.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
                creep.moveTo(enemySpawn);
            }
        }
    }
}

// 远程兵种的攻击方式
export function rangerAttack(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {
    let aliveEnemys: Creep[] = enemys.filter(t => t.hits);
    let aliveRangerList = rangerList.filter(i => i.hits);
    for (let i = 0; i < aliveRangerList.length; i++) {
        let creep = aliveRangerList[i];

        if (!creep.hits) continue;

        // console.log("存活的敌人数量：" + aliveEnemys.length);
        let inRangeEnemys = findInRange(creep, aliveEnemys, 3);
        let closedEnemy = findClosestByPath(creep, aliveEnemys);
        if (inRangeEnemys.length > 0) {
            let targetEnemy = inRangeEnemys[0];
            if (getRange(creep, targetEnemy) < 3) moveAway(creep, closedEnemy);
            let back = creep.rangedAttack(targetEnemy);
            // console.log("移动后攻击敌人效果：" + back);
        } else if (closedEnemy) {
            let back = creep.rangedAttack(closedEnemy);
            if (back == ERR_NOT_IN_RANGE) {
                let tmp = creep.moveTo(closedEnemy);
                // console.log("移动返回值：" + tmp);
            }
        } else {
            if (creep.rangedAttack(enemySpawn) == ERR_NOT_IN_RANGE) {
                creep.moveTo(enemySpawn);
            }
        }
    }
}

// 治疗兵种的治疗方式
export function healerHeal(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {
    let aliveEnemys = enemys.filter(t => t.hits);
    for (let i = 0; i < healerList.length; i++) {
        /**
         * 如果周围3格内有敌人
         * - 自身受到的伤害超过 12*2 就往远处移动，治疗自己
         * - 没有超过12*2，但是超过12*1，贴近最近的残血队友，治疗自己
         * - 没有超过12*1，贴近最近的残血队友，治疗队友
         *
         * 周围3格内没有敌人
         * - 受到的伤害超过 12*1 朝血量比例最低的队友移动，治疗自己
         * - 朝血量比例最低的队友移动，治疗队友
         */
        let creep = healerList[i];
        let otherMy = aliveMy.filter(t => t != creep)
        let closedEnemy = findClosestByRange(creep, enemys)
        let minEnemyDis = getRange(creep, closedEnemy)
        let woundMyCreeps = otherMy.filter(t => t.hits < t.hitsMax)
        // 最近的受伤单位默认是自己
        let closedWoundMy = creep
        // 如果有其他的友方受伤单位，那么就优先治疗最近的
        if (woundMyCreeps.length > 0) {
            closedWoundMy = findClosestByPath(creep, woundMyCreeps)
        }

        let damage = creep.hitsMax - creep.hits
        if (minEnemyDis <= 3) {
            if (damage >= 12 * 2) {
                moveAway(creep, closedEnemy)
                let back = creep.heal(creep)
                console.log(creep.id, "治疗自己结果：" + back);
            } else if (damage >= 12 * 1) {
                if (getRange(creep, closedWoundMy) >= 2) {
                    creep.moveTo(closedWoundMy)
                }
                let back = creep.heal(creep)
            } else {
                if (getRange(creep, closedWoundMy) >= 2) {
                    creep.moveTo(closedWoundMy)
                }
                let back = creep.heal(closedWoundMy)
            }
        } else {
            if (damage >= 12 * 1) {
                if (getRange(creep, closedWoundMy) >= 2) {
                    creep.moveTo(closedWoundMy)
                }
                let back = creep.heal(creep)
            } else {
                if (getRange(creep, closedWoundMy) >= 2) {
                    creep.moveTo(closedWoundMy)
                }
                let back = creep.heal(closedWoundMy)
            }
        }


        // 判断当前的局势，执行移动操作（自保第一，自保的同时尽量接近友方残血单位）
        // let rangeShort = findInRange(creep, aliveEnemys, 1); // 身边的敌人
        // let rangeDistance = []; // 远距离的敌人（只考虑敌人的远程兵）
        // for (let enemy of enemys) {
        //     if (enemy.body.filter(t => t.type == RANGED_ATTACK && t.hits > 0).length > 0) {
        //         rangeDistance.push(enemy)
        //     }
        // }


        // 优先治疗自己（治疗自己一次能恢复12hits，所以判断一下当前血量来提升治疗效率）
        if (damage >= 12 * 1) {
            let back = creep.heal(creep)
        }
        // 查询可治疗范围内的所有友方单位，如果找到血量最低的那个进行治疗
        else {
            if (creep.heal(closedWoundMy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closedWoundMy)
            }
        }

        // 默认治疗自己
        creep.heal(creep)
    }
}

// 状态：全军出击
export function statusAttack(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {
    attackerAttack(enemys, deadMy, aliveMy);
    rangerAttack(enemys, deadMy, aliveMy);
    healerHeal(enemys, deadMy, aliveMy);
}

// 状态：回防高地
export function statusBack(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {}

// 状态：默认状态
export function statusDefault(enemys: Creep[], deadMy: Creep[], aliveMy: Creep[]) {}

export function loop(): void {
    // Your code goes here
    console.log("当前Tick:", getTicks());
    console.log("屯兵位置：", creepStopPosition);

    //   console.log("my spawn id:", spawn.id)
    //   console.log("enemy spawn:", enemySpawn)

    // 创建爬虫
    createCreeps();

    // 搬运能量
    carryEnergy(myContainers);

    // 获取敌人信息
    let enemys = getObjectsByPrototype(Creep).filter(i => !i.my && i.hits);
    let deadMy = getObjectsByPrototype(Creep).filter(i => i.my && !i.hits);
    let aliveMy = getObjectsByPrototype(Creep).filter(i => i.my && i.hits);

    // 等待超过一定时间开始全军出击
    if (getTicks() > 350 && status == CreepStatus.normal) {
        status = CreepStatus.attack;
    }

    switch (status) {
        case CreepStatus.normal:
            console.log("屯兵点待命");
            // statusNormal(enemys, deadMy, aliveMy);
            statusAttack(enemys, deadMy, aliveMy); // TODO test code
            break;
        case CreepStatus.attack:
            console.log("全军出击");
            statusAttack(enemys, deadMy, aliveMy);
            break;
        case CreepStatus.back:
            console.log("回防高地");
            statusBack(enemys, deadMy, aliveMy);
            break;
        default:
            console.log("默认代码");
            statusDefault(enemys, deadMy, aliveMy);
    }
}

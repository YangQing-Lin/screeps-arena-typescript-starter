import {
  findClosestByPath,
  findPath,
  getObjectById,
  getObjectsByPrototype,
  getRange,
  getTicks,
} from "game/utils";
import {
  Creep,
  GameObject,
  GameObjectConstructor,
  Source,
  StructureContainer,
  StructureSpawn,
} from "game/prototypes";
import {
  ATTACK,
  CARRY,
  ERR_NOT_IN_RANGE,
  MOVE,
  RESOURCE_ENERGY,
  RIGHT,
  TOUGH,
  WORK,
} from "game/constants";
// import {} from "arena";

let max_farmer = 3; // 农民数量
let max_attacker = 50; // 战士数量
let max_range_attacker = 0; // 弓箭手数量
let max_healer = 0; // 牧师数量

let farmer_list: Creep[] = [];
let attacker_list: Creep[] = [];
let range_attacker_list = [];
let healer_list = [];

const CreepStatus = {
    normal: "蹲草",
    attack: "全军出击",
    back: "回防高地",
    default: "默认",
};
let status = CreepStatus.normal;

let spawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my)!;
let enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my)!;
// 计算屯兵位置
let creepStopPosition = getOneThirdPosition(spawn, enemySpawn);

export function getOneThirdPosition(fromPos: StructureSpawn, toPos: StructureSpawn) {
    // 通过给定的起始对象和终点对象，返回从起始点到终点路径的三分之一处
    let path = findPath(fromPos, toPos);
    if (path.length < 3) {
        return { x: fromPos.x, y: fromPos.y };
    }
    return path[Math.round(path.length / 3)];
}

export function getAliveCreep(creeps: Creep[]) {
    let alive_creeps = [];
    for (let creep of creeps) {
        if (creep && creep.id && creep.hits) {
            alive_creeps.push(creep);
        }
    }
    return alive_creeps;
}

export function getDeadCreep(creeps: Creep[]) {
    let dead_creeps = [];
    for (let creep of creeps) {
        if (creep && creep.id && !creep.hits) {
            dead_creeps.push(creep);
        }
    }
    return dead_creeps;
}

// 创建爬虫
export function createCreeps() {
    if (farmer_list.length < max_farmer) {
        let creep = spawn.spawnCreep([CARRY, MOVE]).object;
        if (creep) {
            farmer_list.push(creep);
        }
    } else if (attacker_list.length < max_attacker) {
        let creep = spawn.spawnCreep([
            MOVE,
            MOVE,
            MOVE,
            MOVE,
            ATTACK,
            MOVE,
        ]).object;
        if (creep) {
            attacker_list.push(creep);
        }
    }
}

// 搬运能量
export function carryEnergy(containers: StructureContainer[]) {
    for (let i = 0; i < farmer_list.length; i++) {
        let creep = farmer_list[i];
        if (!creep.hits) {
            continue;
        }
        let container = containers[i];
        if (creep.store[RESOURCE_ENERGY] == 0) {
            if (
                creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
            ) {
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
export function statusNormal(enemys: Creep[], dead_my: Creep[], alive_my: Creep[]) {
    for (let i = 0; i < attacker_list.length; i++) {
        let creep = attacker_list[i];
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
    if (dead_my.length > 0) {
        status = CreepStatus.attack;
    }
}

// 状态：全军出击
export function statusAttack(enemys: Creep[], dead_my: Creep[], alive_my: Creep[]) {
    // 近战攻击
    for (let i = 0; i < attacker_list.length; i++) {
        let creep = attacker_list[i];

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
        if (
            closeEnemy &&
            rangeEnemy == rangeSpawn &&
            closeEnemy.x == enemySpawn.x &&
            closeEnemy.y == enemySpawn.y
        ) {
            rangeEnemy += 1;
        }
        console.log(creep.id, rangeEnemy, rangeSpawn);
        if (closeEnemy && rangeEnemy <= rangeSpawn) {
            if (creep.attack(closeEnemy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closeEnemy);
            }
        } else {
            console.log(creep.id, creep.attack(enemySpawn));
            if (creep.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
                creep.moveTo(enemySpawn);
            }
        }
    }
}

// 状态：回防高地
export function statusBack(enemys: Creep[], dead_my: Creep[], alive_my: Creep[]) {

}

// 状态：默认状态
export function statusDefault(enemys: Creep[], dead_my: Creep[], alive_my: Creep[]) {

}



export function loop(): void {
  // Your code goes here
  console.log("当前Tick:", getTicks());
  console.log("屯兵位置：", creepStopPosition);

  let myContainers: StructureContainer[] = [];
  let enemyContainers: StructureContainer[] = [];
  if (Number(spawn.id) == 5) {
      // 强制类型转换：<GameObject> -> <StructureContainer>
      myContainers = getObjectsByPrototype(StructureContainer).filter((i) => Number(i.id) < 5);
      enemyContainers = getObjectsByPrototype(StructureContainer).filter((i) => Number(i.id) > 5);
  } else {
      myContainers = getObjectsByPrototype(StructureContainer).filter((i) => Number(i.id) > 5);
      enemyContainers = getObjectsByPrototype(StructureContainer).filter((i) => Number(i.id) < 5);
  }

  // 创建爬虫
  createCreeps()

  // 搬运能量
  carryEnergy(myContainers)

  // 获取敌人信息
  let enemys = getObjectsByPrototype(Creep).filter((i) => !i.my);
  let dead_my = getDeadCreep(attacker_list);
  let alive_my = getAliveCreep(attacker_list);

  // 等待超过一定时间开始全军出击
  if (getTicks() > 350 && status == CreepStatus.normal) {
      status = CreepStatus.attack;
  }

  switch (status) {
      case CreepStatus.normal:
          console.log("屯兵点待命");
          statusNormal(enemys, dead_my, alive_my)
          break;
      case CreepStatus.attack:
          console.log("全军出击");
          statusAttack(enemys, dead_my, alive_my)
          break;
      case CreepStatus.back:
          console.log("回防高地");
          statusBack(enemys, dead_my, alive_my)
          break;
      default:
          console.log("默认代码");
          statusDefault(enemys, dead_my, alive_my)
  }
}

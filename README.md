# Grass-cutting

一款割草类游戏。

## 游戏特性

### 核心玩法
- 玩家控制角色在地图上移动并自动攻击周围敌人
- 击败敌人获取经验值，升级解锁和强化技能
- 存活尽可能长的时间，挑战更高分数

### 敌人类型 (5种)
1. **史莱姆** - 基础敌人，移动缓慢，容易击杀
2. **骷髅** - 中等敌人，会追踪玩家
3. **蝙蝠** - 飞行敌人，移动迅速，走位飘忽
4. **哥布林** - 远程敌人，会投掷石块攻击
5. **BOSS** - 强大的敌人，击败可获得大量奖励

### 技能系统 (8种以上)

#### 武器技能
1. **剑气斩击** - 释放剑气攻击周围敌人
2. **火焰弹** - 发射追踪敌人的火球
3. **闪电链** - 释放闪电链攻击多个敌人
4. **环形冲击** - 释放环形冲击波攻击周围敌人
5. **箭雨** - 召唤箭雨攻击大范围敌人

#### 被动技能
1. **能量护盾** - 创建护盾抵挡伤害
2. **磁力吸引** - 自动吸引附近的经验值
3. **疾风步** - 提升移动速度
4. **暴击精通** - 提升暴击率和暴击伤害
5. **生命回复** - 持续恢复生命值

### 游戏场景 (3种主题)
1. **神秘森林** - 绿色主题，充满树木和灌木
2. **荒芜沙漠** - 黄色主题，干燥的沙漠环境
3. **幽暗地牢** - 深色主题，神秘的地下世界

## 项目结构

```
Grass-cutting-game/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── main.js             # 游戏入口
│   ├── game.js             # 游戏主循环和状态管理
│   ├── player.js           # 玩家类
│   ├── enemy.js            # 敌人类和管理器
│   ├── skill.js            # 技能定义和管理
│   ├── weapon.js           # 武器系统
│   ├── loot.js             # 战利品系统
│   ├── map.js              # 地图系统
│   ├── particle.js         # 粒子特效系统
│   ├── ui.js               # UI管理和输入处理
│   ├── objectPool.js       # 对象池实现
│   ├── audio.js            # 音频管理
│   └── utils.js            # 工具函数
└── README.md               # 开发文档
```

## 核心架构

### 1. 游戏循环 (Game Loop)
```
初始化 -> 游戏循环 {
    计算帧时间
    更新游戏状态
    渲染画面
} -> 结束
```

### 2. 对象池模式 (Object Pool)
用于优化频繁创建和销毁的对象：
- `ParticlePool` - 粒子特效池
- `ProjectilePool` - 投射物池

### 3. 组件系统
- **Player** - 玩家状态和行为
- **Enemy/EnemyManager** - 敌人生成和管理
- **SkillManager** - 技能升级和效果
- **WeaponManager** - 武器攻击逻辑
- **LootManager** - 战利品掉落和收集

### 4. 状态机
游戏状态流转：
```
menu -> playing -> paused -> playing
                 -> gameover -> menu
```

## 操作说明

- **移动**: WASD 或 方向键
- **暂停**: ESC 或 P 键
- **升级选择**: 点击技能卡片

## 性能优化

1. **对象池** - 复用粒子、投射物等频繁创建的对象
2. **视锥剔除** - 只渲染屏幕可见范围内的对象
3. **帧率限制** - 使用 requestAnimationFrame 确保流畅运行
4. **粒子质量设置** - 可调节粒子效果数量

## 扩展指南

### 添加新敌人
在 `enemy.js` 的 `EnemyTypes` 对象中添加新类型：
```javascript
newEnemy: {
    id: 'newEnemy',
    name: '新敌人',
    color: '#ffffff',
    radius: 20,
    speed: 50,
    hp: 30,
    damage: 10,
    exp: 5,
    score: 20,
    behavior: 'chase', // chase | zigzag | ranged | boss
    spawnWeight: 20,
    minWave: 1
}
```

### 添加新技能
在 `skill.js` 的 `SkillDefinitions` 对象中添加新技能：
```javascript
newSkill: {
    id: 'newSkill',
    name: '新技能',
    icon: '⭐',
    description: '技能描述',
    maxLevel: 8,
    type: 'weapon', // weapon | passive
    baseDamage: 20,
    baseCooldown: 2,
    baseRange: 150,
    upgrades: [
        { level: 2, desc: '升级描述' },
        // ...
    ],
    getStats(level) {
        return {
            damage: this.baseDamage + level * 10,
            cooldown: this.baseCooldown,
            range: this.baseRange
        };
    }
}
```

### 添加新地图主题
在 `map.js` 的 `MapThemes` 对象中添加新主题：
```javascript
newTheme: {
    id: 'newTheme',
    name: '新主题',
    bgColor: '#000000',
    groundColor: '#111111',
    decorationColor: '#222222',
    obstacleColor: '#333333'
}
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 技术栈

- HTML5 Canvas - 游戏渲染
- JavaScript (ES6+) - 游戏逻辑
- CSS3 - UI样式
- Web Audio API - 音频处理

## 许可证

MIT License

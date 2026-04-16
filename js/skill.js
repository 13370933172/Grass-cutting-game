const SkillDefinitions = {
    sword: {
        id: 'sword',
        name: '剑气斩击',
        icon: '⚔️',
        description: '释放剑气攻击周围敌人',
        maxLevel: 8,
        type: 'weapon',
        baseDamage: 20,
        baseCooldown: 1.5,
        baseRange: 200,
        upgrades: [
            { level: 2, desc: '伤害+10, 范围+30' },
            { level: 3, desc: '伤害+15, 冷却-0.2s' },
            { level: 4, desc: '范围+40, 伤害+20' },
            { level: 5, desc: '伤害+25, 冷却-0.3s' },
            { level: 6, desc: '范围+50, 伤害+30' },
            { level: 7, desc: '伤害+35, 冷却-0.2s' },
            { level: 8, desc: '范围+60, 伤害+40' }
        ],
        getStats(level) {
            return {
                damage: this.baseDamage + (level - 1) * 15,
                cooldown: Math.max(0.5, this.baseCooldown - Math.floor(level / 3) * 0.2),
                range: this.baseRange + (level - 1) * 30,
                projectileCount: 1 + Math.floor(level / 3)
            };
        }
    },
    
    fireball: {
        id: 'fireball',
        name: '火焰弹',
        icon: '🔥',
        description: '发射追踪敌人的火球',
        maxLevel: 8,
        type: 'weapon',
        baseDamage: 15,
        baseCooldown: 2,
        baseRange: 300,
        upgrades: [
            { level: 2, desc: '伤害+8, 穿透+1' },
            { level: 3, desc: '发射数量+1' },
            { level: 4, desc: '伤害+12, 范围+50' },
            { level: 5, desc: '穿透+1, 冷却-0.3s' },
            { level: 6, desc: '发射数量+1' },
            { level: 7, desc: '伤害+20, 范围+50' },
            { level: 8, desc: '穿透+2, 伤害+25' }
        ],
        getStats(level) {
            return {
                damage: this.baseDamage + Math.floor((level - 1) * 8),
                cooldown: Math.max(0.8, this.baseCooldown - Math.floor(level / 4) * 0.3),
                range: this.baseRange + Math.floor((level - 1) / 2) * 50,
                pierce: Math.floor(level / 3),
                projectileCount: 1 + Math.floor((level - 1) / 2)
            };
        }
    },
    
    lightning: {
        id: 'lightning',
        name: '闪电链',
        icon: '⚡',
        description: '释放闪电链攻击多个敌人',
        maxLevel: 8,
        type: 'weapon',
        baseDamage: 12,
        baseCooldown: 1.8,
        baseRange: 200,
        upgrades: [
            { level: 2, desc: '连锁次数+1' },
            { level: 3, desc: '伤害+8, 范围+30' },
            { level: 4, desc: '连锁次数+1' },
            { level: 5, desc: '伤害+12, 冷却-0.2s' },
            { level: 6, desc: '连锁次数+2' },
            { level: 7, desc: '伤害+15, 范围+40' },
            { level: 8, desc: '连锁次数+2, 伤害+20' }
        ],
        getStats(level) {
            return {
                damage: this.baseDamage + Math.floor((level - 1) * 5),
                cooldown: Math.max(0.6, this.baseCooldown - Math.floor(level / 5) * 0.2),
                range: this.baseRange + Math.floor((level - 1) / 2) * 30,
                chainCount: 2 + Math.floor((level - 1) / 2)
            };
        }
    },
    
    shield: {
        id: 'shield',
        name: '能量护盾',
        icon: '🛡️',
        description: '创建护盾抵挡伤害',
        maxLevel: 8,
        type: 'passive',
        baseHp: 30,
        baseCooldown: 8,
        upgrades: [
            { level: 2, desc: '护盾HP+15' },
            { level: 3, desc: '冷却-1s' },
            { level: 4, desc: '护盾HP+20' },
            { level: 5, desc: '冷却-1s' },
            { level: 6, desc: '护盾HP+25' },
            { level: 7, desc: '冷却-1.5s' },
            { level: 8, desc: '护盾HP+30, 冷却-1s' }
        ],
        getStats(level) {
            return {
                hp: this.baseHp + (level - 1) * 12,
                cooldown: Math.max(3, this.baseCooldown - Math.floor(level / 2) * 1),
                regenRate: level * 0.5
            };
        }
    },
    
    magnet: {
        id: 'magnet',
        name: '磁力吸引',
        icon: '🧲',
        description: '自动吸引附近的经验值',
        maxLevel: 8,
        type: 'passive',
        baseRange: 80,
        upgrades: [
            { level: 2, desc: '吸引范围+20' },
            { level: 3, desc: '吸引速度+20%' },
            { level: 4, desc: '吸引范围+30' },
            { level: 5, desc: '吸引速度+30%' },
            { level: 6, desc: '吸引范围+40' },
            { level: 7, desc: '吸引速度+40%' },
            { level: 8, desc: '吸引范围+50, 速度+50%' }
        ],
        getStats(level) {
            return {
                range: this.baseRange + (level - 1) * 25,
                speed: 1 + (level - 1) * 0.2
            };
        }
    },
    
    speed: {
        id: 'speed',
        name: '疾风步',
        icon: '💨',
        description: '提升移动速度',
        maxLevel: 8,
        type: 'passive',
        baseSpeed: 1,
        upgrades: [
            { level: 2, desc: '速度+8%' },
            { level: 3, desc: '速度+10%' },
            { level: 4, desc: '速度+12%' },
            { level: 5, desc: '速度+15%' },
            { level: 6, desc: '速度+18%' },
            { level: 7, desc: '速度+20%' },
            { level: 8, desc: '速度+25%' }
        ],
        getStats(level) {
            return {
                speedMultiplier: 1 + (level - 1) * 0.08 + Math.floor((level - 1) / 3) * 0.02
            };
        }
    },
    
    crit: {
        id: 'crit',
        name: '暴击精通',
        icon: '💥',
        description: '提升暴击率和暴击伤害',
        maxLevel: 8,
        type: 'passive',
        baseCritRate: 0.05,
        baseCritDamage: 1.5,
        upgrades: [
            { level: 2, desc: '暴击率+3%' },
            { level: 3, desc: '暴击伤害+10%' },
            { level: 4, desc: '暴击率+5%' },
            { level: 5, desc: '暴击伤害+15%' },
            { level: 6, desc: '暴击率+7%' },
            { level: 7, desc: '暴击伤害+20%' },
            { level: 8, desc: '暴击率+10%, 暴击伤害+25%' }
        ],
        getStats(level) {
            return {
                critRate: this.baseCritRate + Math.floor((level - 1) / 2) * 0.03 + Math.floor((level - 1) / 3) * 0.02,
                critDamage: this.baseCritDamage + Math.floor((level - 1) / 2) * 0.1 + Math.floor((level - 1) / 3) * 0.05
            };
        }
    },
    
    regeneration: {
        id: 'regeneration',
        name: '生命回复',
        icon: '❤️‍🩹',
        description: '持续恢复生命值',
        maxLevel: 8,
        type: 'passive',
        baseRegen: 0.5,
        upgrades: [
            { level: 2, desc: '回复速度+0.3/s' },
            { level: 3, desc: '回复速度+0.4/s' },
            { level: 4, desc: '回复速度+0.5/s' },
            { level: 5, desc: '回复速度+0.6/s' },
            { level: 6, desc: '回复速度+0.7/s' },
            { level: 7, desc: '回复速度+0.8/s' },
            { level: 8, desc: '回复速度+1.0/s' }
        ],
        getStats(level) {
            return {
                regenRate: this.baseRegen + (level - 1) * 0.4
            };
        }
    },
    
    areaAttack: {
        id: 'areaAttack',
        name: '环形冲击',
        icon: '🌀',
        description: '释放环形冲击波攻击周围敌人',
        maxLevel: 8,
        type: 'weapon',
        baseDamage: 25,
        baseCooldown: 3,
        baseRange: 150,
        upgrades: [
            { level: 2, desc: '伤害+15, 范围+20' },
            { level: 3, desc: '冷却-0.4s' },
            { level: 4, desc: '伤害+20, 范围+30' },
            { level: 5, desc: '冷却-0.5s' },
            { level: 6, desc: '伤害+25, 范围+40' },
            { level: 7, desc: '冷却-0.4s' },
            { level: 8, desc: '伤害+30, 范围+50' }
        ],
        getStats(level) {
            return {
                damage: this.baseDamage + (level - 1) * 18,
                cooldown: Math.max(1, this.baseCooldown - Math.floor(level / 2) * 0.4),
                range: this.baseRange + (level - 1) * 25
            };
        }
    },
    
    arrowRain: {
        id: 'arrowRain',
        name: '箭雨',
        icon: '🏹',
        description: '召唤箭雨攻击大范围敌人',
        maxLevel: 8,
        type: 'weapon',
        baseDamage: 8,
        baseCooldown: 4,
        baseRange: 200,
        upgrades: [
            { level: 2, desc: '箭矢数量+5' },
            { level: 3, desc: '伤害+5, 冷却-0.5s' },
            { level: 4, desc: '箭矢数量+5' },
            { level: 5, desc: '范围+30, 伤害+8' },
            { level: 6, desc: '箭矢数量+10' },
            { level: 7, desc: '冷却-0.5s, 伤害+10' },
            { level: 8, desc: '箭矢数量+10, 范围+40' }
        ],
        getStats(level) {
            return {
                damage: this.baseDamage + Math.floor((level - 1) / 2) * 6,
                cooldown: Math.max(2, this.baseCooldown - Math.floor(level / 3) * 0.5),
                range: this.baseRange + Math.floor((level - 1) / 2) * 30,
                arrowCount: 15 + Math.floor((level - 1) / 2) * 5
            };
        }
    }
};

class SkillManager {
    constructor() {
        this.skills = {};
        this.availableSkills = Object.keys(SkillDefinitions);
    }

    hasSkill(skillId) {
        return this.skills.hasOwnProperty(skillId);
    }

    getSkillLevel(skillId) {
        return this.skills[skillId] || 0;
    }

    upgradeSkill(skillId) {
        if (!SkillDefinitions[skillId]) return false;
        
        if (!this.hasSkill(skillId)) {
            this.skills[skillId] = 1;
        } else {
            const definition = SkillDefinitions[skillId];
            if (this.skills[skillId] < definition.maxLevel) {
                this.skills[skillId]++;
            }
        }
        
        return true;
    }

    getSkillStats(skillId) {
        const level = this.getSkillLevel(skillId);
        if (level === 0) return null;
        
        return SkillDefinitions[skillId].getStats(level);
    }

    getUpgradeOptions(count = 3) {
        const options = [];
        const available = [];

        for (const skillId of this.availableSkills) {
            const level = this.getSkillLevel(skillId);
            const definition = SkillDefinitions[skillId];
            
            if (level < definition.maxLevel) {
                available.push(skillId);
            }
        }

        const shuffled = Utils.shuffle(available);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const skillId = shuffled[i];
            const definition = SkillDefinitions[skillId];
            const currentLevel = this.getSkillLevel(skillId);
            
            options.push({
                id: skillId,
                name: definition.name,
                icon: definition.icon,
                description: definition.description,
                currentLevel: currentLevel,
                maxLevel: definition.maxLevel,
                nextUpgrade: currentLevel < definition.maxLevel ? definition.upgrades[currentLevel] : null,
                type: definition.type
            });
        }

        return options;
    }

    getActiveWeapons() {
        const weapons = [];
        for (const skillId in this.skills) {
            if (SkillDefinitions[skillId].type === 'weapon') {
                weapons.push({
                    id: skillId,
                    level: this.skills[skillId],
                    stats: this.getSkillStats(skillId)
                });
            }
        }
        return weapons;
    }

    getPassiveBonuses() {
        const bonuses = {
            speedMultiplier: 1,
            critRate: 0,
            critDamage: 1.5,
            magnetRange: 0,
            magnetSpeed: 1,
            regenRate: 0,
            shieldHp: 0,
            shieldCooldown: 0
        };

        for (const skillId in this.skills) {
            if (SkillDefinitions[skillId].type === 'passive') {
                const stats = this.getSkillStats(skillId);
                
                switch (skillId) {
                    case 'speed':
                        bonuses.speedMultiplier *= stats.speedMultiplier;
                        break;
                    case 'crit':
                        bonuses.critRate += stats.critRate;
                        bonuses.critDamage = Math.max(bonuses.critDamage, stats.critDamage);
                        break;
                    case 'magnet':
                        bonuses.magnetRange = Math.max(bonuses.magnetRange, stats.range);
                        bonuses.magnetSpeed = Math.max(bonuses.magnetSpeed, stats.speed);
                        break;
                    case 'regeneration':
                        bonuses.regenRate += stats.regenRate;
                        break;
                    case 'shield':
                        bonuses.shieldHp = stats.hp;
                        bonuses.shieldCooldown = stats.cooldown;
                        break;
                }
            }
        }

        return bonuses;
    }

    getAllSkills() {
        const result = [];
        for (const skillId in this.skills) {
            const definition = SkillDefinitions[skillId];
            result.push({
                id: skillId,
                name: definition.name,
                icon: definition.icon,
                level: this.skills[skillId],
                maxLevel: definition.maxLevel,
                type: definition.type
            });
        }
        return result;
    }
}

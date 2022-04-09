const fs = require("fs");

const CONFIG_PATH = "./config.txt";
const UPGRADE_PATH = "./upgrades.txt";

class Building {
    type;
    progress = 0;

    Build = (civilians) => {
        if(this.progress >= ((this.type === "C") ? 10800 : 7200)) return true;
        this.progress += 5 * civilians * settings.global_speed * ((this.type === "C") ? settings.civilian_speed : settings.military_speed);
    }

    constructor(_type) {
        this.type = _type;
    }
}

let settings = {
    global_speed : 1.8,
    military_speed : 1,
    civilian_speed : 1,
    common_consumption_goods : 0.28
};

class Upgrade {
    day;
    type;
    value;

    Use = () => {
        let convertedType;
        if(this.type === "M") convertedType = "military_speed";
        else if(this.type === "C") convertedType = "civilian_speed";
        else if(this.type === "A") convertedType = "global_speed";
        else convertedType = "common_consumption_goods";
        settings[convertedType] += Number(this.value);
    }

    constructor(_day, _type, _value) {
        [this.day, this.type, this.value] = [_day, _type, _value];
    }
}

const LoadConfig = async (callback) => {
    let UpgradeList = {};
    let Config = {};
    // TODO : Добавить возможность изменять из файла значение settings
    fs.readFile(CONFIG_PATH, "utf8",
        async function(err,cfg) {
            cfg.split(/\r?\n/).forEach(line => {
            if (!line.startsWith("//")) {
                const args = line.split(" ");
                Config[args[0]] = args[1];
            }
        });
            fs.readFile(UPGRADE_PATH, "utf8",
                async function (error, data) {
                    data.split(/\r?\n/).forEach(line => {
                        if (!line.startsWith("//")) {
                            const args = line.split(" ");
                            UpgradeList[args[0]] = new Upgrade(args[0], args[1], args[2]);
                        }
                    });
                    await callback(UpgradeList, Config);
                });
        })
};

let table = [];

const Simulate = (UpgradeList, Config, MilitarySince) => {
    let InBuilding = [];
    let Civilian = Number(Config.Civilian);
    let Military = Number(Config.Military);

    for(let day = 0; day < Config.days; day ++) {
        if(InBuilding.length < Civilian / 15) {
            InBuilding.push(new Building(day >= MilitarySince ? "M" : "C"));
        }

        if(UpgradeList[day]) {
            UpgradeList[day].Use();
        }

        {
            let key_fix = 0;
            let toDistribute = Math.round(Civilian - ((Civilian + Military) * settings.common_consumption_goods));
            Object.keys(InBuilding).forEach(key => {
                key -= key_fix;
                let distributed = (toDistribute >= 15) ? 15 : toDistribute;
                toDistribute -= distributed;
                if(InBuilding[key].Build(distributed) === true) {
                    if(InBuilding[key].type === "C") {
                        Civilian ++;
                    }
                    else {
                        Military ++;
                    }
                    InBuilding.splice(InBuilding.indexOf(InBuilding[key]),1);
                    key_fix ++;
                }
            });
        }
    }

    table.push({
        day : MilitarySince,
        Civilian : Civilian,
        Military : Military,
        All : Military + Civilian
    });
}

(async () => {
    await LoadConfig(async (UpgradeList, Config) => {
        for(let i = 0; i < Config.days; i ++) {
            settings = {
                global_speed : 1.8,
                military_speed : 1,
                civilian_speed : 1,
                common_consumption_goods : 0.28
            };
            Simulate(UpgradeList, Config, i);
        }
        console.table(table);
    });
})();


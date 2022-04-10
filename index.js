const fs = require("fs");

const CONFIG_PATH = "./config.txt";
const UPGRADE_PATH = "./upgrades.txt";
const SETTING_PATH = "./settings.txt";

let table = [];

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

class Settings {
    global_speed;
    military_speed;
    civilian_speed;
    common_consumption_goods;

    Fix = (number) => {
        return +number.toFixed(2);
    }

    Increase = (param, value) => {
        this[param] += value;
        this[param] = this.Fix(this[param]);
    }

    constructor(_global_speed, _military_speed, _civilian_speed, _common_consumption_goods) {
        [this.global_speed, this.military_speed, this.civilian_speed, this.common_consumption_goods] = [_global_speed, _military_speed, _civilian_speed, _common_consumption_goods]
    }

}

let settings = new Settings();

const types = {
    M : "military_speed",
    C : "global_speed",
    A : "global_speed",
    T : "common_consumption_goods"
}

class Upgrade {
    day;
    type;
    value;

    Use = () => {
        settings.Increase(types[this.type], Number(this.value));
    }

    constructor(_day, _type, _value) {
        [this.day, this.type, this.value] = [_day, _type, _value];
    }
}

const Load = (file, converter, callback) => {
    let array = [];
    fs.readFile(file, "utf8",
        async function(error,data) {
        let lineNumber = 0;
            data.split(/\r?\n/).forEach(line => {
                if (!line.startsWith("//")) {
                    const args = line.split(" ");
                    array[lineNumber] = converter(args);
                    lineNumber++;
                }
            });
            await callback(array);
        });
}

const LoadConfig = async (callback) => {
    Load(CONFIG_PATH, (args) => [args[0], Number(args[1])], (Config) => {
        Load(UPGRADE_PATH, (args) => new Upgrade(...args), (UpgradeList) => {
            Load(SETTING_PATH, (args) => Number(args[1]),async (SettingsList) => {
                await callback(Object.fromEntries(Config), UpgradeList, SettingsList);
            });
        });
    });
};

const Simulate = (Config, UpgradeList, MilitarySince) => {
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
    await LoadConfig(async (Config, UpgradeList, SettingsList) => {
        for(let i = 0; i < Config.days; i ++) {
            settings = new Settings(...SettingsList);
            Simulate(Config, UpgradeList, i);
        }
        console.table(table);
    });
})();

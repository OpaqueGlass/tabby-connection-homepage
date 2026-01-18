import { Injectable } from "@angular/core";
import { TranslateService } from "tabby-core";
import yaml from 'js-yaml';
import yamlFileContent from '../static/i18n.yaml';

@Injectable({ providedIn: 'root' })
export class HomepageTranslateService {
    constructor(
        private translate: TranslateService,
    ) {
    }
    initMyTranslate() {
        const data = yaml.load(yamlFileContent);
        this.translate.setDefaultLang('en-US');
        function transform(obj) {
            const result = {};

            function recurse(current, path) {
                if (typeof current === "object" && !Array.isArray(current)) {
                    // 判断是不是语言节点（全是字符串）
                    const keys = Object.keys(current);
                    const allStrings = keys.every(k => typeof current[k] === "string");
                    if (allStrings) {
                        keys.forEach(lang => {
                            if (!result[lang]) result[lang] = {};
                            setByPath(result[lang], path, current[lang]);
                        });
                    } else {
                        keys.forEach(k => recurse(current[k], path.concat(k)));
                    }
                }
            }

            function setByPath(obj, path, value) {
                let cur = obj;
                for (let i = 0; i < path.length - 1; i++) {
                    if (!cur[path[i]]) cur[path[i]] = {};
                    cur = cur[path[i]];
                }
                cur[path[path.length - 1]] = value;
            }

            recurse(obj, []);
            return result;
        }
        const result = transform(data);
        console.warn("setTrans", result);
        for (const langKey of Object.keys(result)) {
            console.warn("setTrans", langKey, result[langKey])
            if (langKey === "en_US") {
                this.translate.setTranslation("en-UK", result["en_US"], true);
            }
            this.translate.setTranslation(langKey.replace("_", "-"), result[langKey], true);
        }
    }
    test() {

    }
}
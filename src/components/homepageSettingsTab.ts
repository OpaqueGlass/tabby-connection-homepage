import { Component } from '@angular/core'
import { AUTO_INIT_OPTIONS } from '../constants';
import { HomepageTranslateService } from 'services/translateService';
import { PlatformService, TranslateService } from "tabby-core";
import { ConfigService } from 'tabby-core'

@Component({
    template: require('./homepageSettingsTab.pug'),
    styles: [require("./homepageSettingsTab.scss")]
})
export class HomepageSettingsTabComponent {
    readonly AUTO_INIT_OPTIONS = AUTO_INIT_OPTIONS;
    
    readonly autoInitList = Object.entries(AUTO_INIT_OPTIONS).map(([key, label]) => ({
        key,
        label
    }));
    constructor (
        public config: ConfigService,
        private translate: TranslateService,
        private platform: PlatformService
    ) {
        // console.log(this.translate.instant('Application'));
    }
    openGithub() {
        this.platform.openExternal('https://github.com/OpaqueGlass/tabby-connection-homepage')
    }
    openNewIssue() {
        this.platform.openExternal('https://github.com/OpaqueGlass/tabby-connection-homepage/issues/new/choose')
    }
    saveToLocalStorage() {
        this.config.save();
        window.localStorage.setItem("oghp_config_backup", JSON.stringify(this.config.store.ogAutoCompletePlugin));
    }
}
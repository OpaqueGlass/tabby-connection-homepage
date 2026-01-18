/*  
*  tabby-connection-homepage: A simple homepage plugin for tabby.
*  Copyright (C) 2026 OpaqueGlass and other developers
*
*  This program is free software: you can redistribute it and/or modify
*  it under the terms of the GNU Affero General Public License as published
*  by the Free Software Foundation, either version 3 of the License, or
*  (at your option) any later version.
*
*  This program is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU Affero General Public License for more details.
*
*  You should have received a copy of the GNU Affero General Public License
*  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ConfigProvider, ConfigService, HotkeyProvider, ToolbarButtonProvider } from 'tabby-core'
import TabbyCoreModule from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { HomepageConfigProvider } from './configProvider'
import { HomepageSettingsTabProvider } from './settingsTabProvider'
import { HomepageSettingsTabComponent } from 'components/homepageSettingsTab'
import { AutoCompleteHotkeyProvider } from 'hotkeyProvider'
import { ButtonProvider } from 'buttonProvider'
import { HomepageTranslateService } from 'services/translateService'
import { AppService, HostAppService } from 'tabby-core'
import { HomepageTabComponent } from 'components/homepageTab'
import { EditProfileGroupModalComponent } from 'components/editProfileGroupModal.component'
import { EditProfileModalComponent } from 'components/editProfileModal.component'

@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        TabbyCoreModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: HomepageConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: HomepageSettingsTabProvider, multi: true },
        { provide: HotkeyProvider, useClass: AutoCompleteHotkeyProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        HomepageTranslateService,
    ],
    declarations: [
        HomepageSettingsTabComponent,
        HomepageTabComponent,
        EditProfileGroupModalComponent,
        EditProfileModalComponent,
    ],
})
export default class HomepageModule { 
    constructor(
        hostApp: HostAppService, app: AppService, config: ConfigService, translate: HomepageTranslateService
    ) {
        app.ready$.subscribe(() => {
            translate.initMyTranslate();
            if (config.store.ogHomepagePlugin?.autoInit === false) {
                return;
            }
            const homepageTab = app.tabs.find(tab => tab instanceof HomepageTabComponent)
            if (homepageTab) {
                app.selectTab(homepageTab)
            } else {
                app.openNewTabRaw({
                    type: HomepageTabComponent,
                })
            }
        })
    }

}

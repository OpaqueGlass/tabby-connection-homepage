import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { HomepageSettingsTabComponent } from './components/homepageSettingsTab'

/** @hidden */
@Injectable()
export class HomepageSettingsTabProvider extends SettingsTabProvider {
    id = 'ogconnecthomepage'
    // icon
    title = 'Connect Homepage'

    getComponentType (): any {
        return HomepageSettingsTabComponent
    }
}

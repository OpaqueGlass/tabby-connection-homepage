import { AUTO_INIT_OPTIONS } from './constants'
import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class HomepageConfigProvider extends ConfigProvider {
    defaults = {
        ogHomepagePlugin: {
            debugLevel: 3,
            autoInit: AUTO_INIT_OPTIONS.PLUGIN,
            doubleClickToOpen: false,
        },
        hotkeys: {
            'oghomepage_open': [],
        },
    }
}

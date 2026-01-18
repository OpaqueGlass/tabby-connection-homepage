import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class HomepageConfigProvider extends ConfigProvider {
    defaults = {
        ogHomepagePlugin: {
            debugLevel: 3,
            autoInit: true,
        },
        hotkeys: {
            'oghomepage_open': [],
        },
    }
}

import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

/** @hidden */
@Injectable()
export class AutoCompleteHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'oghomepage_open',
            name:'Open Homepage',
        }
    ]

    constructor (
    ) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return [
            ...this.hotkeys
        ]
    }
}
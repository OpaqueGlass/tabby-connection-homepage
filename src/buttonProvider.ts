import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AppService, ConfigService, HostWindowService, HotkeysService, ToolbarButton, ToolbarButtonProvider } from 'tabby-core';
import { inputInitScripts, sendInput } from 'utils/commonUtils';
import { Subject } from "rxjs";
import { MySignalService } from 'services/signalService';
import { HomepageTabComponent } from 'components/homepageTab';

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    private recentDialogRef: any;

    private currentStatus: boolean;
    // private menuStatusNS: Subject<void> = new Subject<void>();
    // public menuStatus$ = this.menuStatusNS.asObservable();
    constructor (
        hotkeys: HotkeysService,
        private hostWnd: HostWindowService,
        private app: AppService,
        private ngbModal: NgbModal,
        private signalService: MySignalService,
        private configService: ConfigService,
    ) {
        super();
        this.currentStatus = configService.store?.ogAutoCompletePlugin?.enableCompleteWithCompleteStart;
        // 仅注册在 ToolbarButtonProvider 中有效？
        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'oghomepage_open') {
                this.openHomepage();
            }
        });
    }

    private openDevTools() {
        this.hostWnd.openDevTools();
    }

    private openHomepage() {
        const homepageTab = this.app.tabs.find(tab => tab instanceof HomepageTabComponent)
        if (homepageTab) {
            this.app.selectTab(homepageTab)
        } else {
            this.app.openNewTabRaw({
                type: HomepageTabComponent,
            })
        }
    }

    provide(): ToolbarButton[] {
        const that = this;
        return [{
            icon: require('./icons/house.svg'),
            weight: 5,
            title: 'Open Homepage',
            touchBarNSImage: 'NSTouchBarComposeTemplate',
            click: async () => {
                that.openHomepage();
            }
        }];
    }
}
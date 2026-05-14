import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AppService, Command, CommandLocation, CommandProvider, ConfigService, HostWindowService, HotkeysService, ToolbarButton, ToolbarButtonProvider, TranslateService } from 'tabby-core';
import { inputInitScripts, sendInput } from 'utils/commonUtils';
import { Subject } from "rxjs";
import { MySignalService } from 'services/signalService';
import { HomepageTabComponent } from 'components/homepageTab';

@Injectable()
export class HomepageCommandProvider extends CommandProvider {
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
        private translate: TranslateService,
    ) {
        super();
        this.currentStatus = configService.store?.ogAutoCompletePlugin?.enableCompleteWithCompleteStart;
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

    async provide(): Promise<Command[]> {
        const that = this;
        const showLocations = [CommandLocation.StartPage];
        if (this.configService.store.ogHomepagePlugin?.btnOnLeftToolbar) {
            showLocations.push(CommandLocation.LeftToolbar);
        } else {
            showLocations.push(CommandLocation.RightToolbar);
        }
        return [
            {
                id: 'ogHomepage:open-homepage',
                locations: showLocations,
                label: this.translate.instant('Open Homepage'),
                icon: require('./icons/house.svg'),
                weight: this.configService.store.ogHomepagePlugin?.homepageBtnWeight ?? 0,
                run: async () => {
                    that.openHomepage();
                },
            },
        ];
    }
}
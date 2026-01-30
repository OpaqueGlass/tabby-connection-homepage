import { Component, Injector, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core'
import Fuse from 'fuse.js'
import { v4 as uuidv4 } from 'uuid' 
import { BaseTabComponent, ProfilesService, NotificationsService, Profile, PartialProfile } from 'tabby-core'
import { ProfileManagementService } from 'services/profileManagementService'
import { HomepageTranslateService } from 'services/translateService'
import { TranslateService } from "tabby-core";
import { MyLogger } from 'services/myLogService'
import { orderBy } from 'natural-orderby';
@Component({
    template: require('./homepageTab.pug'),
    styles: [require('./homepageTab.scss')],
    host: {
        'style': 'display: block; width: 100%;'
    }
})
export class HomepageTabComponent extends BaseTabComponent implements OnInit, AfterViewInit {
    @ViewChild('ogchsearchInput') searchInput!: ElementRef<HTMLInputElement>;
    connections = []  // 原始的连接列表
    groups = []       // 根据分组后的数据
    allGroups = []    // 全部分组数据（用于搜索还原）
    @Input() searchQuery = ''  // 搜索查询输入内容
    fuse: Fuse<any>   // Fuse.js 搜索实例
    searchDebounceTimer: any = null; // 防抖定时器引用

    constructor(
        private profilesService: ProfilesService,
        private profileMgr: ProfileManagementService,
        private translate: TranslateService,
        private logger: MyLogger,
        injector: Injector,
        private notificationService: NotificationsService,
    ) {
        super(injector)
        this.setTitle('Homepage')
        this.icon = 'fas fa-house'
        this.focused$.subscribe(() => {
            // 当标签页获得焦点时，刷新分组数据
            this.refreshGroups(false);
            this.searchConnections();
            this.logger.log('Homepage tab focused, refreshed groups and search.');
        });
    }

    async ngOnInit() {
        // 初始化连接列表
        const allProfiles = await this.profilesService.getProfiles()
        this.connections = allProfiles
        // 初始化分组
        this.refreshGroups()
        this.fuse = new Fuse(this.connections, {
            keys: ['name', 'options.host', 'type', 'options.user'],
            threshold: 0.5,
        })
    }
    ngAfterViewInit() {
        setTimeout(() => {
            this.searchInput.nativeElement.focus();
        }, 0);
    }
    async refreshGroups(refreshAll: boolean = true) {
        // 1. 并发获取数据
        const [recentProfiles, fetchedGroups] = await Promise.all([
            this.profilesService.getRecentProfiles(),
            this.profilesService.getProfileGroups({ 
                includeProfiles: true, 
                includeNonUserGroup: this.config.store.terminal.showBuiltinProfiles 
            })
        ]);

        // 定义内部处理函数：清洗数据并进行组内升序排序
        const processConnections = (profiles: PartialProfile<Profile>[]) => {
            const processed = (profiles || []).map(conn => {
                const iconValue = conn.icon || 'fas fa-desktop';
                return {
                    ...conn,
                    icon: iconValue,
                    isHTML: iconValue.trim().startsWith('<svg')
                };
            });
            
            // 连接内部按照名称 (name) 升序排序
            return orderBy(processed, [v => v.name]);
        };

        // 2. 构建 "Recent" 分组 (Recent 始终排第一，不参与后续的分组排序)
        const recentGroup = {
            id: 'recent',
            name: this.translate.instant('Recent'),
            connections: processConnections(recentProfiles)
        };

        // 3. 处理并映射普通分组
        let mappedGroups = fetchedGroups.map(group => ({
            id: group.id,
            name: group.name,
            connections: processConnections(group.profiles)
        })).filter(group => group.connections.length > 0);

        // 4. 分组排序逻辑
        const getGroupWeight = (id: string) => {
            if (id === 'ungrouped') return 1;
            if (id.startsWith('Imported-from-')) return 2;
            if (id === 'built-in') return 3;
            return 0; // 普通分组权重最低，排在前面
        };

        mappedGroups = orderBy(
            mappedGroups,
            [
                v => getGroupWeight(v.id), // 首先按权重排序 (0 < 1 < 2 < 3)
                v => v.name                // 权重相同时（即都是普通分组时），按名称升序
            ]
        );

        // 5. 合并数据：确保 Recent 在首位
        const finalGroups = [];
        if (recentGroup.connections.length > 0) {
            finalGroups.push(recentGroup);
        }
        finalGroups.push(...mappedGroups);

        this.allGroups = finalGroups;
        if (refreshAll) {
            this.groups = [...this.allGroups];
        }
        this.logger.log('Refreshed and sorted groups:', this.groups);
    }

    onCompositionEnd(event: any) {
        this.searchQuery = event.target.value;
        this.searchConnections();
    }

    searchConnections() {
        // 清除之前的定时器
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // 设置 300ms 延迟执行
        this.searchDebounceTimer = setTimeout(() => {
            const query = this.searchQuery.trim().toLowerCase();
                
            if (!query) {
                this.groups = [...this.allGroups];
                return;
            }

            // 执行过滤逻辑
            this.groups = this.allGroups.map(group => {
                const filteredConns = group.connections.filter(conn => 
                    conn.name.toLowerCase().includes(query) || 
                    (conn.options?.host && conn.options.host.toLowerCase().includes(query))
                );
                return { ...group, connections: filteredConns };
            }).filter(group => group.connections.length > 0);

            // 重置定时器引用
            this.searchDebounceTimer = null;
        }, 300); // 300ms 是搜索框常用的防抖时间
    }
    openConnection(conn) {
        this.profilesService.launchProfile(conn)
    }

    async createConnection() {
        await this.profileMgr.newProfile()
        await this.refreshData() // 操作完成后刷新列表
    }

    async editConnection(conn) {
        await this.profileMgr.editProfile(conn)
        await this.refreshData() 
    }

    async deleteConnection(conn) {
        await this.profileMgr.deleteProfile(conn)
        await this.refreshData()
    }

    async cloneConnection(connection) {
        // 直接将当前的连接作为基准传入，profileMgr 会处理复制逻辑
        await this.profileMgr.newProfile(connection)
        await this.refreshData()
    }

    // 封装一个统一的刷新逻辑
    async refreshData() {
        const allProfiles = await this.profilesService.getProfiles()
        this.connections = allProfiles
        await this.refreshGroups()
    }

    onSearchEnter() {
        const query = this.searchQuery.trim()
        
        // 只有在有输入内容且当前有搜索结果时才执行
        if (query && this.groups.length > 0) {
            // 找到第一个分组中的第一个连接
            const firstGroup = this.groups[0]
            if (firstGroup.connections && firstGroup.connections.length > 0) {
                const firstConn = firstGroup.connections[0]
                this.openConnection(firstConn)
            }
        }
    }
    async onQuickConnect() {
        const query = this.searchQuery.trim()
        if (query) {
            const providers = this.profilesService.getProviders();
            const parts = query.split(" ");
            let protocol = "ssh";
            let address = query;
            if (parts.length > 1) {
                protocol = parts[0];
                address = parts.slice(1).join(" ");
            }
            let flag = false;
            for (const provider of providers) {
                if (provider.id === protocol || provider.name.toLowerCase() === protocol.toLowerCase()) {
                    // @ts-ignore
                    const result = await provider.quickConnect(address)
                    if (result) {
                        this.openConnection(result)
                        flag = true;
                        break;
                    }
                }
            }
            if (!flag) {
                this.notificationService.info("No matching protocol provider found.");
            }
        }
    }
}
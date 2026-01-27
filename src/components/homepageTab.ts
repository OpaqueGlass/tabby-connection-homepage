import { Component, Injector, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core'
import Fuse from 'fuse.js'
import { v4 as uuidv4 } from 'uuid' 
import { BaseTabComponent, ProfilesService, NotificationsService } from 'tabby-core'
import { ProfileManagementService } from 'services/profileManagementService'
import { HomepageTranslateService } from 'services/translateService'

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

    constructor(
        private profilesService: ProfilesService,
        private profileMgr: ProfileManagementService,
        private translate: HomepageTranslateService,
        injector: Injector,
        private notificationService: NotificationsService,
    ) {
        super(injector)
        this.setTitle('Homepage')
        this.icon = 'fas fa-house'
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
    async refreshGroups() {
        // 1. 调用你提供的接口获取分组数据
        // 设置 includeProfiles: true 自动完成 ID 匹配
        // 设置 includeNonUserGroup: true 处理 'Ungrouped' 和 'Built-in'
        // @ts-ignore
        const fetchedGroups = await this.profilesService.getProfileGroups({ 
            includeProfiles: true, 
            includeNonUserGroup: true 
        });

        // 2. 统一映射数据结构，确保 HTML 模板中的变量名一致
        // 这里的 x.profiles 对应你 HTML 里的 conn
        this.allGroups = fetchedGroups.map(group => ({
            id: group.id,
            name: group.name,
            connections: group.profiles || [] // 将 profiles 映射为 connections 方便模板统一
        })).filter(group => group.connections.length > 0); // (可选) 隐藏没有内容的空组

        this.groups = [...this.allGroups];
    }

    // 搜索逻辑
    searchConnections() {
        const query = this.searchQuery.trim().toLowerCase();
        if (!query) {
            this.groups = [...this.allGroups];
            return;
        }

        // 在每个组内过滤连接，并只保留含有匹配结果的分组
        this.groups = this.allGroups.map(group => {
            const filteredConns = group.connections.filter(conn => 
                conn.name.toLowerCase().includes(query) || 
                (conn.options?.host && conn.options.host.toLowerCase().includes(query))
            );
            return { ...group, connections: filteredConns };
        }).filter(group => group.connections.length > 0);
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
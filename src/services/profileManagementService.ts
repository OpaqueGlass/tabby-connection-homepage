import { Injectable, Inject } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import deepClone from 'clone-deep'
import {
    ConfigService, ProfilesService, SelectorService,
    TranslateService, PlatformService, ProfileProvider,
    Profile, PartialProfile, PromptModalComponent,
    ProfileGroup,
    PartialProfileGroup
} from 'tabby-core'
import { EditProfileModalComponent } from '../components/editProfileModal.component'
import { EditProfileGroupModalComponent, EditProfileGroupModalComponentResult } from 'components/editProfileGroupModal.component'

interface CollapsableProfileGroup extends ProfileGroup {
    collapsed: boolean
}

@Injectable({ providedIn: 'root' })
export class ProfileManagementService {
    constructor(
        private config: ConfigService,
        private profilesService: ProfilesService,
        private selector: SelectorService,
        private ngbModal: NgbModal,
        private platform: PlatformService,
        private translate: TranslateService,
        @Inject(ProfileProvider) private profileProviders: ProfileProvider<Profile>[],
    ) { }

    isProfileBlacklisted(profile: PartialProfile<Profile>): boolean {
        return profile.id && this.config.store.profileBlacklist.includes(profile.id)
    }

    async newProfile(base?: PartialProfile<Profile>): Promise<void> {
        if (!base) {
            let profiles = await this.profilesService.getProfiles()
            profiles = profiles.filter(p => !this.isProfileBlacklisted(p))
            profiles.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))

            base = await this.selector.show(
                this.translate.instant('Select a base profile to use as a template'),
                profiles.map(p => ({
                    icon: p.icon,
                    description: this.profilesService.getDescription(p) ?? undefined,
                    name: p.group ? `${this.profilesService.resolveProfileGroupName(p.group)} / ${p.name}` : p.name,
                    result: p,
                })),
            ).catch(() => undefined)

            if (!base) return
        }

        const baseProfile: PartialProfile<Profile> = deepClone(base)
        delete baseProfile.id
        if (base.isTemplate) {
            baseProfile.name = ''
        } else if (!base.isBuiltin) {
            baseProfile.name = this.translate.instant('{name} copy', base)
        }
        baseProfile.isBuiltin = false
        baseProfile.isTemplate = false

        const result = await this.showProfileEditModal(baseProfile)
        if (!result) return

        if (!result.name) {
            const cfgProxy = this.profilesService.getConfigProxyForProfile(result)
            result.name = this.profilesService.providerForProfile(result)?.getSuggestedName(cfgProxy) ?? this.translate.instant('{name} copy', base)
        }
        await this.profilesService.newProfile(result)
        await this.config.save()
    }

    async editProfile(profile: PartialProfile<Profile>): Promise<void> {
        const result = await this.showProfileEditModal(profile)
        if (!result) return
        await this.profilesService.writeProfile(result)
        await this.config.save()
    }

    async deleteProfile(profile: PartialProfile<Profile>): Promise<void> {
        const choice = await this.platform.showMessageBox({
            type: 'warning',
            message: this.translate.instant('Delete "{name}"?', profile),
            buttons: [
                this.translate.instant('Delete'),
                this.translate.instant('Keep'),
            ],
            defaultId: 1,
            cancelId: 1,
        })

        if (choice.response === 0) {
            await this.profilesService.deleteProfile(profile)
            await this.config.save()
        }
    }

    async showProfileEditModal(profile: PartialProfile<Profile>): Promise<PartialProfile<Profile> | null> {
        const modal = this.ngbModal.open(EditProfileModalComponent, { size: 'lg' })
        const provider = this.profilesService.providerForProfile(profile)
        if (!provider) {
            throw new Error('Cannot edit a profile without a provider')
        }
        modal.componentInstance.profile = deepClone(profile)
        modal.componentInstance.profileProvider = provider

        const result = await modal.result.catch(() => null)
        if (!result) return null
        result.type = provider.id
        return result
    }


    async newProfileGroup(): Promise<void> {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('New group name')
        const result = await modal.result.catch(() => null)
        if (result?.value.trim()) {
            await this.profilesService.newProfileGroup({ id: '', name: result.value })
            await this.config.save()
        }
    }

    async editProfileGroup(group: PartialProfileGroup<CollapsableProfileGroup>): Promise<void> {
        const result = await this.showProfileGroupEditModal(group)
        if (!result) {
            return
        }
        await this.profilesService.writeProfileGroup(ProfileManagementService.collapsableIntoPartialProfileGroup(result))
        await this.config.save()
    }

    async showProfileGroupEditModal(group: PartialProfileGroup<CollapsableProfileGroup>): Promise<PartialProfileGroup<CollapsableProfileGroup> | null> {
        const modal = this.ngbModal.open(
            EditProfileGroupModalComponent,
            { size: 'lg' },
        )

        modal.componentInstance.group = deepClone(group)
        modal.componentInstance.providers = this.profileProviders

        const result: EditProfileGroupModalComponentResult<CollapsableProfileGroup> | null = await modal.result.catch(() => null)
        if (!result) {
            return null
        }

        if (result.provider) {
            return this.editProfileGroupDefaults(result.group, result.provider)
        }

        return result.group
    }

    private async editProfileGroupDefaults(group: PartialProfileGroup<CollapsableProfileGroup>, provider: ProfileProvider<Profile>): Promise<PartialProfileGroup<CollapsableProfileGroup> | null> {
        const modal = this.ngbModal.open(
            EditProfileModalComponent,
            { size: 'lg' },
        )
        const model = group.defaults?.[provider.id] ?? {}
        model.type = provider.id
        modal.componentInstance.profile = Object.assign({}, model)
        modal.componentInstance.profileProvider = provider
        modal.componentInstance.defaultsMode = 'group'

        const result = await modal.result.catch(() => null)
        if (result) {
            // Fully replace the config
            for (const k in model) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete model[k]
            }
            Object.assign(model, result)
            if (!group.defaults) {
                group.defaults = {}
            }
            group.defaults[provider.id] = model
        }
        return this.showProfileGroupEditModal(group)
    }

    async deleteProfileGroup(group: PartialProfileGroup<ProfileGroup>): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Delete "{name}"?', group),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            },
        )).response === 0) {
            let deleteProfiles = false
            if ((group.profiles?.length ?? 0) > 0 && (await this.platform.showMessageBox(
                {
                    type: 'warning',
                    message: this.translate.instant('Delete the group\'s profiles?'),
                    buttons: [
                        this.translate.instant('Move to "Ungrouped"'),
                        this.translate.instant('Delete'),
                    ],
                    defaultId: 0,
                    cancelId: 0,
                },
            )).response !== 0) {
                deleteProfiles = true
            }

            await this.profilesService.deleteProfileGroup(group, { deleteProfiles })
            await this.config.save()
        }
    }

    private static collapsableIntoPartialProfileGroup(group: PartialProfileGroup<CollapsableProfileGroup>): PartialProfileGroup<ProfileGroup> {
        const g: any = { ...group }
        delete g.collapsed
        return g
    }

    private static intoPartialCollapsableProfileGroup(group: PartialProfileGroup<ProfileGroup>, collapsed: boolean): PartialProfileGroup<CollapsableProfileGroup> {
        const collapsableGroup = {
            ...group,
            collapsed,
        }
        return collapsableGroup
    }
}
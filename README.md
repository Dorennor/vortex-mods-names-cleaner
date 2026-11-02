# Clean Mod Names

A Vortex extension that removes archive extensions (`.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.tgz`, `.bz2`, `.xz`, `.001`) from the display names of newly installed mods, for all games. Mods count as newly installed when they are installed, reinstalled or updated. Other installed mods are left alone. It doesn't depend on any other extension.

## Install

1. Close Vortex.
2. Double-click `install.bat`. It copies `info.json` and `index.js` to `%APPDATA%\Vortex\plugins\clean-mod-names\`. Run it again after changing the code; it replaces the old files.
3. Start Vortex. **Clean Mod Names** should appear on the Extensions page, enabled.

To uninstall, remove it from the Extensions page, or delete that folder while Vortex is closed. Names the extension already cleaned stay cleaned.

## What it changes

It only changes the display name, stored in `customFileName`, the attribute Vortex's own rename feature uses. It also stores a small `cleanModNamesAutoName` attribute to remember which names it set.

| Situation | Result |
|---|---|
| Name comes from the archive and ends in an extension | Extension removed; the name follows future updates |
| You renamed the mod | Your name is kept; only a trailing archive extension is removed |
| Collections, and mods still installing | Skipped |

## What it can't change

- **Mod IDs and staging folders.** Some IDs contain the extension, such as `Foo.zip-123-1-0-1700000000`. See below.
- **An extension in the middle of a name.** Only the end is cleaned, so `Foo.zip 123 1.0 2026-01-01 abc.zip` becomes `Foo.zip 123 1.0 2026-01-01 abc`. This only affects mods with no `logicalFileName` and an archive named that way.
- **Names of mods you renamed by hand.** Vortex keeps a manual name across updates, and this extension treats it as yours. A name containing a version, such as `EpicLoot-0.14.13`, keeps showing that version after an update until you rename it.
- **Names that arrive after the install.** The extension runs once when the install finishes. If Vortex later fills in a name ending in `.zip`, it stays until that mod is next installed or updated.

## Is the extension in the mod ID?

Sometimes, and it doesn't affect the displayed name.

Vortex builds the ID from the archive name with only the last extension removed. If a mod author's file is called `Foo.zip`, the download becomes `Foo.zip-123-1-0-1700000000.zip`, and the ID becomes `Foo.zip-123-1-0-1700000000`. The staging folder uses the same name.

The mod list doesn't read the ID when an attribute supplies a name, so these mods still display cleanly. This extension doesn't rename IDs: `deriveModInstallName` offers no hook to change them at install time, and renaming them afterwards would mean moving staging folders and updating everything that refers to the old ID.

Alternatives, if a clean ID or folder name matters for a particular mod:

1. **Leave it (recommended).** The ID is mainly visible in the staging folder and logs.
2. **Install from a renamed archive.** Rename `Foo.zip-123-1-0-1700000000.zip` to `Foo.zip` and install it manually. Update checks may no longer work for that mod, because the file name is no longer the one Vortex downloaded. This hasn't been tested.
3. **Ask for a change in Vortex.** Removing the extension from IDs would have to happen in `deriveModInstallName`, in Vortex core.

## What was verified

Checked against the Vortex source at tag `v2.9.1`:

| Question | Finding | Source |
|---|---|---|
| Does `did-install-mod` exist? | Yes, with arguments `(gameId, archiveId, modId, info)`. Attributes are saved before it fires. | `mod_management/InstallManager.ts` |
| What sets the displayed name? | `customFileName`, then `logicalFileName`, `fileName`, `name`, then the install path. `fileName` was missing from the original plan. | `mod_management/util/modName.ts` |
| Where does the `.zip` come from? | Vortex core and Nexus file names, not the Valheim extension, which never sets a display name. | `download_management/index.ts`, Valheim `index.js` |
| Is it in the ID? | Sometimes, as explained above. | `InstallManager.ts`, `modIdManager.ts` |
| Do names survive updates? | `customFileName` does, which would freeze old version numbers. The extension handles this. | `mod_management/util/extractors.ts` |
| Is changing `customFileName` safe for dependencies? | Mostly. Rules also match `logicalFileName`, which isn't changed. A rule that matched only a renamed mod's old `Name.zip` would stop matching. | `mod_management/util/testModReference.ts` |

**Not verified:** it hasn't been run inside Vortex; the logic was only tested against a mocked API.

## Manual test plan

1. **Zip:** install a mod from `Foo.zip`. It should display as `Foo`.
2. **7z:** install a mod from `Bar.7z`. It should display as `Bar`.
3. **Existing mods:** before installing the extension, note a mod whose name still ends in an extension, or rename one to `Test.zip`. Restart Vortex with the extension installed. That name should not change, and `Foo` and `Bar` should stay clean.
4. **Updates:** install a mod with a version in its name, such as `Foo-1.0.zip`, after adding the extension, then update it. The name should change to the new version, not stay on the old one.
5. **Your renames:** rename a mod, restart, and check the name is kept.
6. **Other games:** check a mod in a game other than Valheim.
7. **Deployment:** deploy, and check that dependency rules in the mod list show no new errors.

If something goes wrong, search `%APPDATA%\Vortex\vortex.log` for `clean-mod-names`.

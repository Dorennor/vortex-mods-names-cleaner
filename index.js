const { actions, log, util } = require('vortex-api');

// Vortex shows: customFileName || logicalFileName || fileName || name.
// customFileName is the same attribute the mod list's rename feature writes, and
// it is the only one that is safe to change: logicalFileName and fileName are used
// to match mod rules and dependencies.
const CUSTOM_NAME = 'customFileName';

// Records the name this extension wrote, which separates it from a user's rename.
// Vortex keeps customFileName when a mod is updated, so without this record a name
// such as "Foo-1.0" would stay on the mod after it is updated to 2.0.
const AUTO_NAME = 'cleanModNamesAutoName';

const ARCHIVE_EXTENSION = /\.(?:zip|rar|7z|tar|gz|tgz|bz2|xz)$/i;
// The digit check keeps version-like names intact: "Mod v1.001" is not an archive part.
const SPLIT_ARCHIVE_PART = /(?<!\d)\.001$/;

function stripArchiveExtensions(name) {
  let current = name.trim();
  let stripped = false;
  for (; ;) {
    const next = current.replace(ARCHIVE_EXTENSION, '').replace(SPLIT_ARCHIVE_PART, '').trim();
    if (next === current) {
      break;
    }
    current = next;
    stripped = true;
  }
  // A name that is nothing but an extension (".zip") is left as it is.
  return stripped && current !== '' ? current : name;
}

// Returns the attribute changes a mod needs, or undefined if it needs none.
function planChanges(attributes) {
  const custom = attributes[CUSTOM_NAME];
  const autoName = attributes[AUTO_NAME];
  const baseName = attributes.logicalFileName || attributes.fileName || attributes.name;

  if (custom && custom !== autoName) {
    // The name was set by the user or another extension: only remove the extension.
    const cleaned = stripArchiveExtensions(custom);
    if (cleaned !== custom) {
      return { [CUSTOM_NAME]: cleaned, [AUTO_NAME]: undefined };
    }
    return autoName !== undefined ? { [AUTO_NAME]: undefined } : undefined;
  }

  if (!baseName) {
    return undefined;
  }

  const cleaned = stripArchiveExtensions(baseName);
  if (cleaned === baseName) {
    // Nothing to clean, so any earlier automatic name is no longer needed.
    return custom || autoName !== undefined
      ? { [CUSTOM_NAME]: undefined, [AUTO_NAME]: undefined }
      : undefined;
  }
  return cleaned === custom ? undefined : { [CUSTOM_NAME]: cleaned, [AUTO_NAME]: cleaned };
}

function changesToActions(gameId, modId, mod) {
  // A collection's customFileName is its title, and core Vortex reads it as such.
  if (mod?.attributes === undefined || mod.state !== 'installed' || mod.type === 'collection') {
    return [];
  }
  const changes = planChanges(mod.attributes);
  if (changes === undefined) {
    return [];
  }
  return Object.keys(changes).map(key => actions.setModAttribute(gameId, modId, key, changes[key]));
}

function cleanInstalledMod(api, gameId, modId) {
  const mod = api.getState().persistent.mods?.[gameId]?.[modId];
  util.batchDispatch(api.store, changesToActions(gameId, modId, mod));
}

function main(context) {
  // Carries the record through a mod update, when Vortex builds the new mod's attributes.
  context.registerAttributeExtractor(25, input => {
    const autoName = input?.previous?.[AUTO_NAME];
    return Promise.resolve(autoName !== undefined ? { [AUTO_NAME]: autoName } : {});
  });

  context.once(() => {
    context.api.events.on('did-install-mod', (gameId, archiveId, modId) => {
      try {
        cleanInstalledMod(context.api, gameId, modId);
      } catch (err) {
        log('warn', 'clean-mod-names: failed to clean mod name', { gameId, modId, error: err.message });
      }
    });
  });

  return true;
}

module.exports = { default: main };

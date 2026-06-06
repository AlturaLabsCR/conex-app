const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lexical' || moduleName.startsWith('@lexical/')) {
    return context.resolveRequest(
      {
        ...context,
        unstable_conditionNames: (context.unstable_conditionNames || []).filter(
          (condition) => condition !== 'node'
        ),
      },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

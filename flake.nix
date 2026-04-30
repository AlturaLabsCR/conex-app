{
  description = "Development shell for the Conex Expo app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ flake-parts, nixpkgs, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      perSystem = { system, ... }:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };

          androidComposition = pkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "35" ];
            buildToolsVersions = [ "35.0.0" ];
            includeEmulator = false;
            includeSystemImages = false;
            includeNDK = false;
          };

          androidSdk = androidComposition.androidsdk;
          androidSdkRoot = "${androidSdk}/libexec/android-sdk";
        in
        {
          devShells.default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.jdk17
            ];

            shellHook = ''
              export ANDROID_USER_HOME="$PWD/.android"
              export ANDROID_HOME="${androidSdkRoot}"
              export ANDROID_SDK_ROOT="${androidSdkRoot}"

              mkdir -p "$ANDROID_USER_HOME"

              android_cmdline_tools_bin=""
              android_build_tools_bin=""

              for candidate in "$ANDROID_HOME"/cmdline-tools/*/bin; do
                if [ -d "$candidate" ]; then
                  android_cmdline_tools_bin="$candidate"
                  break
                fi
              done

              for candidate in "$ANDROID_HOME"/build-tools/*; do
                if [ -d "$candidate" ]; then
                  android_build_tools_bin="$candidate"
                  break
                fi
              done

              export PATH="$ANDROID_HOME/platform-tools:$PATH"
              if [ -n "$android_build_tools_bin" ]; then
                export PATH="$android_build_tools_bin:$PATH"
              fi
              if [ -n "$android_cmdline_tools_bin" ]; then
                export PATH="$android_cmdline_tools_bin:$PATH"
              fi
            '';
          };
        };
    };
}

class NoCleanSceneFoundError(RuntimeError):
    """No scene under the cloud-cover threshold was found within the
    lookback window. Shared by every scene-fetching module (Sentinel-2,
    Landsat, ...) since it means the same thing regardless of provider:
    leave whatever data you already have alone, don't wipe it.
    """

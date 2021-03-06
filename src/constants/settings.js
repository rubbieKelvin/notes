import { ORDER, OPTIONS as SORTING_OPTIONS } from "./sorting";

export const SETTING_KEYS = {
    SORTING_ORDER: 'SORTING_ORDER',
    SORTING_TYPE: 'SORTING_TYPE'
}

export const DEFAULT_SETTINGS = {
    [SETTING_KEYS.SORTING_ORDER]: ORDER.ACSENDING,
    [SETTING_KEYS.SORTING_TYPE]: SORTING_OPTIONS.DEFAULT
}
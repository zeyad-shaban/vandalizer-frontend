// do i define this just here in src/utils.js or is ther ea beter structure for utilities?

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

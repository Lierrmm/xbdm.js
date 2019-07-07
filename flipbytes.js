exports.reorder = function(swizzled) {
    let block = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,18,19,16,17,22,23,20,21,26,27,24,25,30,31,28,29,33,34,35,32,37,38,39,36,41,42,43,40,45,46,47,44,51,48,49,50,55,52,53,54,59,56,57,58,63,60,61,62];
    let deswizzled = [];
    let swiz = 0, index = 0, offset = 0;
    let deswiz = 1226240;
    let i, j, k, l;
    for (i = 0; i < 30; i = (i + 1) | 0) {
        for (j = 0; j < 10; j = (j + 1) | 0) {
            if ((i & 1) === 1) {
                if ((j & 1) === 1) {
                    deswiz = (deswiz - 256) | 0;
                } else {
                    deswiz = (deswiz + 256) | 0;
                }
            }
            for (l = 0; l < 4; l = (l + 1) | 0) {
                for (k = 0; k < 16; k = (k + 1) | 0) {
                    offset = offset = ((parseInt(block[index] & 0xFFFFFFFE) >> 2) * 256) + ((block[index] & 3) * 16);
                    index = (index + 1) & 63;
                    for (var v = 0; v < 15; v = (v + 1) | 0) {
                        if ((v & 3) !== 3) {
                            deswizzled[deswiz + v] = swizzled[swiz + offset + v];
                            deswizzled[deswiz - 2560 + v] = swizzled[swiz + offset + 64 + v];
                            deswizzled[deswiz - 5120 + v] = swizzled[swiz + offset + 128 + v];
                            deswizzled[deswiz - 7680 + v] = swizzled[swiz + offset + 192 + v];
                        }
                    }
                    deswiz = (deswiz + 16) | 0;
                }
                deswiz = (deswiz - 10496) | 0;
            }
            deswiz = (deswiz + 41216) | 0;
            swiz = (swiz + 4096) | 0;

            if ((i & 1) === 1) {
                if ((j & 1) === 1) {
                    deswiz = (deswiz + 256) | 0;
                } else {
                    deswiz = (deswiz - 256) | 0;
                }
            }
        }
        deswiz = (deswiz - 43520) | 0;
    }
    return deswizzled;
};
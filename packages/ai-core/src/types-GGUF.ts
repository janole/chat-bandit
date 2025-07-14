enum LlamaFileType
{
    ALL_F32 = 0,
    MOSTLY_F16 = 1, // except 1d tensors
    MOSTLY_Q4_0 = 2, // except 1d tensors
    MOSTLY_Q4_1 = 3, // except 1d tensors
    // MOSTLY_Q4_1_SOME_F16 = 4, // tok_embeddings.weight and output.weight are F16
    // MOSTLY_Q4_2 = 5, // support has been removed
    // MOSTLY_Q4_3 = 6, // support has been removed
    MOSTLY_Q8_0 = 7, // except 1d tensors
    MOSTLY_Q5_0 = 8, // except 1d tensors
    MOSTLY_Q5_1 = 9, // except 1d tensors
    MOSTLY_Q2_K = 10, // except 1d tensors
    MOSTLY_Q3_K_S = 11, // except 1d tensors
    MOSTLY_Q3_K_M = 12, // except 1d tensors
    MOSTLY_Q3_K_L = 13, // except 1d tensors
    MOSTLY_Q4_K_S = 14, // except 1d tensors
    MOSTLY_Q4_K_M = 15, // except 1d tensors
    MOSTLY_Q5_K_S = 16, // except 1d tensors
    MOSTLY_Q5_K_M = 17, // except 1d tensors
    MOSTLY_Q6_K = 18, // except 1d tensors
    MOSTLY_IQ2_XXS = 19, // except 1d tensors
    MOSTLY_IQ2_XS = 20, // except 1d tensors
    MOSTLY_Q2_K_S = 21, // except 1d tensors
    MOSTLY_IQ3_XS = 22, // except 1d tensors
    MOSTLY_IQ3_XXS = 23, // except 1d tensors
    MOSTLY_IQ1_S = 24, // except 1d tensors
    MOSTLY_IQ4_NL = 25, // except 1d tensors
    MOSTLY_IQ3_S = 26, // except 1d tensors
    MOSTLY_IQ3_M = 27, // except 1d tensors
    MOSTLY_IQ2_S = 28, // except 1d tensors
    MOSTLY_IQ2_M = 29, // except 1d tensors
    MOSTLY_IQ4_XS = 30, // except 1d tensors
    MOSTLY_IQ1_M = 31, // except 1d tensors
    MOSTLY_BF16 = 32, // except 1d tensors
    // MOSTLY_Q4_0_4_4 = 33, // removed from gguf files, use Q4_0 and runtime repack
    // MOSTLY_Q4_0_4_8 = 34, // removed from gguf files, use Q4_0 and runtime repack
    // MOSTLY_Q4_0_8_8 = 35, // removed from gguf files, use Q4_0 and runtime repack
    MOSTLY_TQ1_0 = 36, // except 1d tensors
    MOSTLY_TQ2_0 = 37, // except 1d tensors
    // GUESSED = 1024 // not specified in the model file
}

const enumToStringMap: { [key in LlamaFileType]: string } = {
    [LlamaFileType.ALL_F32]: "F32",
    [LlamaFileType.MOSTLY_F16]: "F16",
    [LlamaFileType.MOSTLY_Q4_0]: "Q4_0",
    [LlamaFileType.MOSTLY_Q4_1]: "Q4_1",
    [LlamaFileType.MOSTLY_Q8_0]: "Q8_0",
    [LlamaFileType.MOSTLY_Q5_0]: "Q5_0",
    [LlamaFileType.MOSTLY_Q5_1]: "Q5_1",
    [LlamaFileType.MOSTLY_Q2_K]: "Q2_K",
    [LlamaFileType.MOSTLY_Q3_K_S]: "Q3_K_S",
    [LlamaFileType.MOSTLY_Q3_K_M]: "Q3_K_M",
    [LlamaFileType.MOSTLY_Q3_K_L]: "Q3_K_L",
    [LlamaFileType.MOSTLY_Q4_K_S]: "Q4_K_S",
    [LlamaFileType.MOSTLY_Q4_K_M]: "Q4_K_M",
    [LlamaFileType.MOSTLY_Q5_K_S]: "Q5_K_S",
    [LlamaFileType.MOSTLY_Q5_K_M]: "Q5_K_M",
    [LlamaFileType.MOSTLY_Q6_K]: "Q6_K",
    [LlamaFileType.MOSTLY_IQ2_XXS]: "IQ2_XXS",
    [LlamaFileType.MOSTLY_IQ2_XS]: "IQ2_XS",
    [LlamaFileType.MOSTLY_Q2_K_S]: "Q2_K_S",
    [LlamaFileType.MOSTLY_IQ3_XS]: "IQ3_XS",
    [LlamaFileType.MOSTLY_IQ3_XXS]: "IQ3_XXS",
    [LlamaFileType.MOSTLY_IQ1_S]: "IQ1_S",
    [LlamaFileType.MOSTLY_IQ4_NL]: "IQ4_NL",
    [LlamaFileType.MOSTLY_IQ3_S]: "IQ3_S",
    [LlamaFileType.MOSTLY_IQ3_M]: "IQ3_M",
    [LlamaFileType.MOSTLY_IQ2_S]: "IQ2_S",
    [LlamaFileType.MOSTLY_IQ2_M]: "IQ2_M",
    [LlamaFileType.MOSTLY_IQ4_XS]: "IQ4_XS",
    [LlamaFileType.MOSTLY_IQ1_M]: "IQ1_M",
    [LlamaFileType.MOSTLY_BF16]: "BF16",
    [LlamaFileType.MOSTLY_TQ1_0]: "TQ1_0",
    [LlamaFileType.MOSTLY_TQ2_0]: "TQ2_0",
    // [LlamaFileType.GUESSED]: "GUESSED"
};

function llamaFileTypeToString(fileType?: LlamaFileType): string | undefined
{
    return fileType !== undefined ? enumToStringMap[fileType] : undefined;
}

const enumToBitsMap: { [key in LlamaFileType]: number } = {
    [LlamaFileType.ALL_F32]: 32,
    [LlamaFileType.MOSTLY_F16]: 16,
    [LlamaFileType.MOSTLY_Q4_0]: 4,
    [LlamaFileType.MOSTLY_Q4_1]: 4,
    [LlamaFileType.MOSTLY_Q8_0]: 8,
    [LlamaFileType.MOSTLY_Q5_0]: 5,
    [LlamaFileType.MOSTLY_Q5_1]: 5,
    [LlamaFileType.MOSTLY_Q2_K]: 2,
    [LlamaFileType.MOSTLY_Q3_K_S]: 3,
    [LlamaFileType.MOSTLY_Q3_K_M]: 3,
    [LlamaFileType.MOSTLY_Q3_K_L]: 3,
    [LlamaFileType.MOSTLY_Q4_K_S]: 4,
    [LlamaFileType.MOSTLY_Q4_K_M]: 4,
    [LlamaFileType.MOSTLY_Q5_K_S]: 5,
    [LlamaFileType.MOSTLY_Q5_K_M]: 5,
    [LlamaFileType.MOSTLY_Q6_K]: 6,
    [LlamaFileType.MOSTLY_IQ2_XXS]: 2,
    [LlamaFileType.MOSTLY_IQ2_XS]: 2,
    [LlamaFileType.MOSTLY_Q2_K_S]: 2,
    [LlamaFileType.MOSTLY_IQ3_XS]: 3,
    [LlamaFileType.MOSTLY_IQ3_XXS]: 3,
    [LlamaFileType.MOSTLY_IQ1_S]: 1,
    [LlamaFileType.MOSTLY_IQ4_NL]: 4,
    [LlamaFileType.MOSTLY_IQ3_S]: 3,
    [LlamaFileType.MOSTLY_IQ3_M]: 3,
    [LlamaFileType.MOSTLY_IQ2_S]: 2,
    [LlamaFileType.MOSTLY_IQ2_M]: 2,
    [LlamaFileType.MOSTLY_IQ4_XS]: 4,
    [LlamaFileType.MOSTLY_IQ1_M]: 1,
    [LlamaFileType.MOSTLY_BF16]: 16,
    [LlamaFileType.MOSTLY_TQ1_0]: 1,
    [LlamaFileType.MOSTLY_TQ2_0]: 2,
    // [LlamaFileType.GUESSED]: "GUESSED"
};

function llamaFileTypeToBits(fileType?: LlamaFileType): number | undefined
{
    return fileType !== undefined ? enumToBitsMap[fileType] : undefined;
}

export
{
    llamaFileTypeToBits,
    llamaFileTypeToString,
};

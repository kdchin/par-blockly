
import type {Block} from '../../core/block.js';
import type {CreateWithBlock} from '../../blocks/lists.js';
import type {JavascriptGenerator} from './javascript_generator.js';
import {NameType} from '../../core/names.js';
import {Order} from './javascript_generator.js';


export function parallel_fork(
    block: Block,
    generator: JavascriptGenerator
// ): [string, Order] {
): string {
    const threadValues = generator.valueToCode(block, 'FORK1', Order.NONE);
    const threadCode = generator.prefixLines(threadValues, generator.INDENT);
    const shouldAwait = block.getFieldValue("AWAIT") === "sync";
    const code = `
${shouldAwait ? 'await ' : ''}Promise.all([
${threadCode}
]);\n`;
    // TODO(mult): should probably support await here
    // return [code, Order.AWAIT];
    return code;
}

export function parallel_fork_add(
    block: Block,
    generator: JavascriptGenerator
): [string, Order] {
    const threadValues = generator.valueToCode(block, 'NEXT_THREAD', Order.NONE);
    let branch = generator.statementToCode(block, 'DO');
    const allCode: string[] = [];
    const currentBranchCode = `(async () => {\n${branch}\n})()`;
    allCode.push(currentBranchCode);
    if (threadValues) {
        allCode.push(threadValues);
    }
    return [allCode.join(',\n'), Order.NONE];
}

export function parallel_fork_add_return(
    block: Block,
    generator: JavascriptGenerator
) {
    return `return ${generator.valueToCode(block, 'RETURN', Order.NONE)};\n`;
}

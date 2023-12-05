import * as eventUtils from '../core/events/utils.js';
import * as xmlUtils from '../core/utils/xml.js';
import {Align} from '../core/inputs/align.js';
import type {Block} from '../core/block.js';
import type {Connection} from '../core/connection.js';
import {Msg} from '../core/msg.js';
import {MutatorIcon} from '../core/icons/mutator_icon.js';
import type {BlockSvg} from '../core/block_svg.js';
import type {Workspace} from '../core/workspace.js';
import {
  createBlockDefinitionsFromJsonArray,
  defineBlocks,
} from '../core/common.js';
import { Extensions } from '../core/blockly.js';



// export const blocks = createBlockDefinitionsFromJsonArray([
//     {
//         'type': 'parallel_synchronize',
//         'previousStatement': true,
//         'nextStatement': true,
//     }
// ]);

/**
 * Type of a 'lists_create_with' block.
 *
 * @internal
 */
export type CreateWithBlock = Block & ParallelSyncMixin;
interface ParallelSyncMixin extends ParallelSyncMixinType {
  itemCount_: number;
}
type ParallelSyncMixinType = typeof PARALLEL_SYNC;
const PARALLEL_SYNC = {
  /**
   * Block for creating a list with any number of elements of any type.
   */
  init: function (this: CreateWithBlock) {
    this.setHelpUrl(Msg['LISTS_CREATE_WITH_HELPURL']);
    this.setStyle('list_blocks');
    this.itemCount_ = 5;
    this.updateShape_();
    this.setOutput(true, 'Array');
    this.setMutator(
      new MutatorIcon(['lists_create_with_item'], this as unknown as BlockSvg),
    ); // BUG(#6905)
    this.setTooltip(Msg['LISTS_CREATE_WITH_TOOLTIP']);
  },
  /**
   * Create XML to represent list inputs.
   * Backwards compatible serialization implementation.
   */
  mutationToDom: function (this: CreateWithBlock): Element {
    const container = xmlUtils.createElement('mutation');
    container.setAttribute('items', String(this.itemCount_));
    return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * Backwards compatible serialization implementation.
   *
   * @param xmlElement XML storage element.
   */
  domToMutation: function (this: CreateWithBlock, xmlElement: Element) {
    const items = xmlElement.getAttribute('items');
    if (!items) throw new TypeError('element did not have items');
    this.itemCount_ = parseInt(items, 10);
    this.updateShape_();
  },
  /**
   * Returns the state of this block as a JSON serializable object.
   *
   * @returns The state of this block, ie the item count.
   */
  saveExtraState: function (this: CreateWithBlock): {itemCount: number} {
    return {
      'itemCount': this.itemCount_,
    };
  },
  /**
   * Applies the given state to this block.
   *
   * @param state The state to apply to this block, ie the item count.
   */
  loadExtraState: function (this: CreateWithBlock, state: AnyDuringMigration) {
    this.itemCount_ = state['itemCount'];
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   *
   * @param workspace Mutator's workspace.
   * @returns Root block in mutator.
   */
  decompose: function (
    this: CreateWithBlock,
    workspace: Workspace,
  ): ContainerBlock {
    const containerBlock = workspace.newBlock(
      'lists_create_with_container',
    ) as ContainerBlock;
    (containerBlock as BlockSvg).initSvg();
    let connection = containerBlock.getInput('STACK')!.connection;
    for (let i = 0; i < this.itemCount_; i++) {
      const itemBlock = workspace.newBlock(
        'lists_create_with_item',
      ) as ItemBlock;
      (itemBlock as BlockSvg).initSvg();
      if (!itemBlock.previousConnection) {
        throw new Error('itemBlock has no previousConnection');
      }
      connection!.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   *
   * @param containerBlock Root block in mutator.
   */
  compose: function (this: CreateWithBlock, containerBlock: Block) {
    let itemBlock: ItemBlock | null = containerBlock.getInputTargetBlock(
      'STACK',
    ) as ItemBlock;
    // Count number of inputs.
    const connections: Connection[] = [];
    while (itemBlock) {
      if (itemBlock.isInsertionMarker()) {
        itemBlock = itemBlock.getNextBlock() as ItemBlock | null;
        continue;
      }
      connections.push(itemBlock.valueConnection_ as Connection);
      itemBlock = itemBlock.getNextBlock() as ItemBlock | null;
    }
    // Disconnect any children that don't belong.
    for (let i = 0; i < this.itemCount_; i++) {
      const connection = this.getInput('ADD' + i)!.connection!.targetConnection;
      if (connection && connections.indexOf(connection) === -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (let i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, 'ADD' + i);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   *
   * @param containerBlock Root block in mutator.
   */
  saveConnections: function (this: CreateWithBlock, containerBlock: Block) {
    let itemBlock: ItemBlock | null = containerBlock.getInputTargetBlock(
      'STACK',
    ) as ItemBlock;
    let i = 0;
    while (itemBlock) {
      if (itemBlock.isInsertionMarker()) {
        itemBlock = itemBlock.getNextBlock() as ItemBlock | null;
        continue;
      }
      const input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input?.connection!
        .targetConnection as Connection;
      itemBlock = itemBlock.getNextBlock() as ItemBlock | null;
      i++;
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   */
  updateShape_: function (this: CreateWithBlock) {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY').appendField(
        Msg['LISTS_CREATE_EMPTY_TITLE'],
      );
    }
    // Add new inputs.
    for (let i = 0; i < this.itemCount_; i++) {
      if (!this.getInput('ADD' + i)) {
        const input = this.appendValueInput('ADD' + i).setAlign(Align.RIGHT);
        if (i === 0) {
          input.appendField(Msg['LISTS_CREATE_WITH_INPUT_WITH']);
        }
      }
    }
    // Remove deleted inputs.
    for (let i = this.itemCount_; this.getInput('ADD' + i); i++) {
      this.removeInput('ADD' + i);
    }
  },
}

/** Type for a 'lists_create_with_container' block. */
type ContainerBlock = Block & ContainerMutator;
interface ContainerMutator extends ContainerMutatorType {}
type ContainerMutatorType = typeof LISTS_CREATE_WITH_CONTAINER;

const LISTS_CREATE_WITH_CONTAINER = {
  /**
   * Mutator block for list container.
   */
  init: function (this: ContainerBlock) {
    this.setStyle('list_blocks');
    this.appendDummyInput().appendField(
      Msg['LISTS_CREATE_WITH_CONTAINER_TITLE_ADD'],
    );
    this.appendStatementInput('STACK');
    this.setTooltip(Msg['LISTS_CREATE_WITH_CONTAINER_TOOLTIP']);
    this.contextMenu = false;
  },
};

/** Type for a 'lists_create_with_item' block. */
type ItemBlock = Block & ItemMutator;
interface ItemMutator extends ItemMutatorType {
  valueConnection_?: Connection;
}
type ItemMutatorType = typeof LISTS_CREATE_WITH_ITEM;

const LISTS_CREATE_WITH_ITEM = {
  /**
   * Mutator block for adding items.
   */
  init: function (this: ItemBlock) {
    this.setStyle('list_blocks');
    this.appendDummyInput().appendField(Msg['LISTS_CREATE_WITH_ITEM_TITLE']);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Msg['LISTS_CREATE_WITH_ITEM_TOOLTIP']);
    this.contextMenu = false;
  },
};

function MAIN_FORK_EXTENSION (this: Block) {
  this.workspace.addChangeListener((event) => {
    if (event.type !== eventUtils.BLOCK_CHANGE) {
      return;
    }
  });
}

Extensions.register('parallel_fork_extension', MAIN_FORK_EXTENSION);

export const blocks = createBlockDefinitionsFromJsonArray([
    {
        'type': 'parallel_fork',
        'previousStatement': true,
        'nextStatement': true,
        'message0': 'create a new fork with ... %1',
        'args0': [
            {
                'type': 'input_value',
                'name': 'FORK1',
                'align': 'LEFT',
            },
        ],

        'message1': 'and %1 for result',
        'args1': [
          {
            "type": "field_dropdown",
            "name": "AWAIT",
            "options": [
              ["don't wait", "async"],
              ["wait", "sync"],
            ],
          },
        ],
        'isAsync': true,
        'inputsInline': false,
        'style': 'parallel_blocks',
        'extensions': ['parallel_fork_extension'],
    },
    {
        'type': 'parallel_fork_add',
        'message0': 'a new thread. Add another? %1',
        'args0': [
            {
                'type': 'input_value',
                'name': 'NEXT_THREAD',
                'align': 'RIGHT',
            },
        ],
        'message1': '%{BKY_CONTROLS_REPEAT_INPUT_DO} %1',
        'args1': [
          {
            'type': 'input_statement',
            'name': 'DO',
          },
        ],
        'output': 'Array',
        'isAsync': true,
        'style': 'parallel_blocks',
    },
    {
      'type': 'parallel_fork_add_return',
      'previousStatement': true,
      'message0': 'join with %1',
      'args0':[{
        'type': 'input_value',
        'name': 'RETURN',
        'align': 'RIGHT',
      }],
    }
]);
blocks["parallel_sync"] = PARALLEL_SYNC;
defineBlocks(blocks);
// {
//     parallel_sync: PARALLEL_SYNC
// };


// import { javascriptGenerator } from 'blockly/javascript';

// var json = Blockly.serialization.workspaces.save(workspace);

// // Store top blocks separately, and remove them from the JSON.
// var blocks = json['blocks']['blocks'];
// var topBlocks = blocks.slice();  // Create shallow copy.
// blocks.length = 0;

// // Load each block into the workspace individually and generate code.
// var allCode = [];
// var headless = new Blockly.Workspace();
// for (var i = 0; block < topBlocks.length; i++) {
//     var block = topBlocks[i];
//     blocks.push(block);
//     Blockly.serialization.workspaces.load(json, headless);
//     allCode.push(javascriptGenerator.workspaceToCode(headless));
//     blocks.length = 0;
// }
import { GraphQLBoolean, GraphQLInputObjectType, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, } from "graphql";
import { runToolRequest } from "../chatService.js";
const FilterInput = new GraphQLInputObjectType({
    name: "FilterInput",
    fields: {
        field: { type: new GraphQLNonNull(GraphQLString) },
        value: { type: new GraphQLNonNull(GraphQLString) },
    },
});
const TimeRangeInput = new GraphQLInputObjectType({
    name: "TimeRangeInput",
    fields: {
        from: { type: GraphQLString },
        to: { type: GraphQLString },
    },
});
const ToolInputArg = new GraphQLInputObjectType({
    name: "ToolInputArg",
    fields: {
        intent: { type: new GraphQLNonNull(GraphQLString) },
        filters: { type: new GraphQLList(FilterInput) },
        group_by: { type: new GraphQLList(GraphQLString) },
        metrics: { type: new GraphQLList(GraphQLString) },
        time_range: { type: TimeRangeInput },
        limit: { type: GraphQLInt },
    },
});
const ToolResultType = new GraphQLObjectType({
    name: "ToolResult",
    fields: {
        answer_text: { type: new GraphQLNonNull(GraphQLString) },
        tool_selected: { type: new GraphQLNonNull(GraphQLString) },
        visual_hint: { type: new GraphQLNonNull(GraphQLString) },
        dataset_json: { type: new GraphQLNonNull(GraphQLString) },
        query_id: { type: new GraphQLNonNull(GraphQLString) },
        policy_allow: { type: new GraphQLNonNull(GraphQLBoolean) },
        policy_reason: { type: new GraphQLNonNull(GraphQLString) },
    },
});
async function runToolIntent(toolHint, args) {
    const filters = {};
    for (const item of args.input.filters ?? []) {
        filters[item.field] = item.value;
    }
    const toolInput = {
        intent: args.input.intent,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        group_by: args.input.group_by,
        metrics: args.input.metrics,
        time_range: args.input.time_range,
        limit: args.input.limit,
    };
    const tool = toolHint;
    const response = await runToolRequest({
        user_id: args.user_id,
        role: args.role,
        routed: {
            tool,
            toolInput,
            provider: "none",
            fallbackUsed: false,
        },
    });
    return {
        answer_text: response.answer_text,
        tool_selected: response.tool_selected,
        visual_hint: response.tool_output.visual_hint,
        dataset_json: JSON.stringify(response.tool_output.dataset),
        query_id: response.tool_output.query_id,
        policy_allow: response.tool_output.policy_decision.allow,
        policy_reason: response.tool_output.policy_decision.reason,
    };
}
const QueryType = new GraphQLObjectType({
    name: "Query",
    fields: {
        overview: {
            type: ToolResultType,
            args: {
                user_id: { type: new GraphQLNonNull(GraphQLString) },
                role: { type: GraphQLString },
                input: { type: new GraphQLNonNull(ToolInputArg) },
            },
            resolve: async (_, args) => runToolIntent("overview_tool", args),
        },
        trends: {
            type: ToolResultType,
            args: {
                user_id: { type: new GraphQLNonNull(GraphQLString) },
                role: { type: GraphQLString },
                input: { type: new GraphQLNonNull(ToolInputArg) },
            },
            resolve: async (_, args) => runToolIntent("trends_tool", args),
        },
        segmentation: {
            type: ToolResultType,
            args: {
                user_id: { type: new GraphQLNonNull(GraphQLString) },
                role: { type: GraphQLString },
                input: { type: new GraphQLNonNull(ToolInputArg) },
            },
            resolve: async (_, args) => runToolIntent("segmentation_tool", args),
        },
        drilldown: {
            type: ToolResultType,
            args: {
                user_id: { type: new GraphQLNonNull(GraphQLString) },
                role: { type: GraphQLString },
                input: { type: new GraphQLNonNull(ToolInputArg) },
            },
            resolve: async (_, args) => runToolIntent("drilldown_tool", args),
        },
    },
});
export const schema = new GraphQLSchema({ query: QueryType });

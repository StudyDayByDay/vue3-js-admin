// 划词标记操作类型接口
export default {
    // 新增实体  
    addEntity: {
        url: '/mark/addEntity',
        method: 'post'
    },
    // 新增模块 
    addModule: {
        url: '/mark/addModule',
        method: 'post'
    },
    // 新增实体关系 
    addEntityRelation: {
        url: '/mark/addEntityRelation',
        method: 'post'
    },
    // 删除实体 
    deleteEntity: {
        url: '/mark/deleteEntity',
        method: 'delete'
    },
    // 删除关系 
    deleteEntityRelation: {
        url: '/mark/deleteEntityRelation',
        method: 'delete'
    },
};
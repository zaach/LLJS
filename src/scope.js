(function (exports) {
  var util, T, Types;
  if (typeof process !== "undefined") {
    util = require("./util.js");
    T = require("./estransform.js");
    Types = require("./types.js");
  } else {
    util = this.util;
    T = estransform;
    Types = this.Types;
  }

  /**
   * Import nodes.
   */
  const Node = T.Node;
  const Literal = T.Literal;
  const Identifier = T.Identifier;
  const VariableDeclaration = T.VariableDeclaration;
  const VariableDeclarator = T.VariableDeclarator;
  const MemberExpression = T.MemberExpression;
  const BinaryExpression = T.BinaryExpression;
  const SequenceExpression = T.SequenceExpression;
  const CallExpression = T.CallExpression;
  const AssignmentExpression = T.AssignmentExpression;
  const ExpressionStatement = T.ExpressionStatement;
  const ReturnStatement = T.ReturnStatement;
  const Program = T.Program;
  const FunctionDeclaration = T.FunctionDeclaration;
  const FunctionExpression = T.FunctionExpression;
  const ConditionalExpression = T.ConditionalExpression;
  const ObjectExpression = T.ObjectExpression;
  const UnaryExpression = T.UnaryExpression;
  const NewExpression = T.NewExpression;
  const UpdateExpression = T.UpdateExpression;
  const ForStatement = T.ForStatement;
  const BlockStatement = T.BlockStatement;
  const CatchClause = T.CatchClause;
  const ThisExpression = T.ThisExpression;
  const TypeAliasDirective = T.TypeAliasDirective;
  const CastExpression = T.CastExpression;

  /**
   * Import utilities.
   */
  const assert = util.assert;
  const cast = util.cast;
  const alignTo = util.alignTo;
  const dereference = util.dereference;
  const forceType = util.forceType;

  /**
   * Import types.
   */
  const TypeAlias = Types.TypeAlias;
  const PrimitiveType = Types.PrimitiveType;
  const StructType = Types.StructType;
  const PointerType = Types.PointerType;
  const ArrayType = Types.ArrayType;
  const ArrowType = Types.ArrowType;

  /**
   * Scopes and Variables
   */

  function Variable(name, type, global) {
    this.name = name;
    this.type = type;
    this.global = global;
    this.isStackAllocated = (type instanceof StructType || type instanceof ArrayType);
  }

  Variable.prototype.toString = function () {
    return Types.tystr(this.type, 0) + " " + this.name;
  };

  Variable.prototype.getStackAccess = function getStackAccess(scope, loc) {
    assert(this.isStackAllocated);
    assert(typeof this.byteOffset !== "undefined", "stack-allocated variable offset not computed.");
    var byteOffset = this.byteOffset;
    var sp;
    if(this.global) {
      sp = forceType(
        new BinaryExpression(
          '-',
          new Identifier('totalSize'),
          new Identifier('globalSP')
        ),
        Types.i32ty
      );
    }
    else {
      sp = scope.SP();
    }

    return dereference(sp, byteOffset, this.type, scope, loc);
  };

  function Scope(parent, name) {
    this.name = name;
    this.parent = parent;
    this.root = parent.root;
    this.variables = Object.create(null);
    this.frame = parent.frame;

    assert(this.frame instanceof Frame);
  }

  Scope.prototype.getVariable = function getVariable(name, local) {
    var variable = this.variables[name];
    if (variable instanceof Variable) {
      return variable;
    }

    if (this.parent && !local) {
      return this.parent.getVariable(name);
    }

    return null;
  };

  Scope.prototype.addVariable = function addVariable(variable, external) {
    assert(variable);
    assert(!variable.frame);
    assert(!this.variables[variable.name], "Scope already has a variable named " + variable.name);
    variable.frame = this.frame;

    var variables = this.variables;
    var name = variable.name;

    variables[name] = variable;
    if (!external) {
      variable.name = this.freshName(name, variable);
      this.frame.scopedVariables[variable.name] = variable;
    }

    //console.log("added variable " + variable + " to scope " + this);
 };

  Scope.prototype.freshName = function freshName(name, variable) {
    var mangles = this.frame.mangles;
    var fresh = 0;
    var freshName = name;

    // Mangle the name if it clases with anything in the root's scope
    // because it gives us control over the scope (easier for asm.js)
    while (mangles[freshName] || this.root.mangles[freshName]) {
      freshName = name + "$" + ++fresh;
    }
    if (variable) {
      mangles[freshName] = variable;
    }
    return freshName;
  };

  Scope.prototype.freshVariable = function freshVariable(name, type) {
    var variable = new Variable(name, type);
    variable.name = this.freshName(name, variable);
    return variable;
  };

  Scope.prototype.freshTemp = function freshTemp(ty, loc, inDeclarator) {
    var t = this.freshVariable("_", ty);
    var id = cast(new Identifier(t.name), ty);
    if (!inDeclarator) {
      var cachedLocals = this.frame.cachedLocals;
      cachedLocals[t.name] = new VariableDeclarator(id);
    }
    return id;
  };

  Scope.prototype.cacheReference = function cacheReference(node) {
    assert(node);

    var def, use;

    if (node instanceof MemberExpression && !(node.object instanceof Identifier)) {
      assert(!node.computed);
      var t = this.freshTemp(node.object.ty, node.object.loc);
      node.object = new AssignmentExpression(t, "=", node.object, node.object.loc);
      var use = new MemberExpression(t, node.property, false, "[]", node.property.loc);
      return { def: node, use: use };
    }

    return { def: node, use: node };
  };

  Scope.prototype.MEMORY = function MEMORY() {
    return this.root.MEMORY();
  };

  Scope.prototype.getView = function getView(type) {
    return this.frame.getView(type);
  };

  Scope.prototype.MALLOC = function MALLOC() {
    return this.frame.MALLOC();
  };

  Scope.prototype.FREE = function FREE() {
    return this.frame.FREE();
  };

  Scope.prototype.MEMCPY = function MEMCPY(size) {
    return this.frame.MEMCPY(size);
  };

  Scope.prototype.MEMSET = function MEMSET(size) {
    return this.frame.MEMSET(size);
  };

  // Scope.prototype.MEMCHECK_CALL_PUSH = function MEMCHECK_CALL_PUSH() {
  //   return this.frame.MEMCHECK_CALL_PUSH();
  // };

  // Scope.prototype.MEMCHECK_CALL_RESET = function MEMCHECK_CALL_RESET() {
  //   return this.frame.MEMCHECK_CALL_RESET();
  // };

  // Scope.prototype.MEMCHECK_CALL_POP = function MEMCHECK_CALL_POP() {
  //   return this.frame.MEMCHECK_CALL_POP();
  // };

  Scope.prototype.toString = function () {
    return this.name;
  };

  function Frame(parent, name) {
    this.name = name;
    this.parent = parent;
    this.root = parent ? parent.root : this;
    this.variables = Object.create(null);
    this.cachedLocals = Object.create(null);
    this.frame = this;
    this.mangles = Object.create(null);
    this.scopedVariables = Object.create(null);
  }

  Frame.prototype = Object.create(Scope.prototype);

  function getBuiltin(frame, name, ty) {
    return cast(new Identifier(frame.root.getVariable(name).name), ty);
  }

  // Frame.prototype.MEMORY = function MEMORY() {
  //   assert(this.root === this);
  //   if (!this.cachedMEMORY) {
  //     this.cachedMEMORY = new Identifier(this.freshVariable("$M").name);
  //   }
  //   return this.cachedMEMORY;
  // };

  Frame.prototype.MALLOC = function MALLOC() {
    return getBuiltin(this, 'malloc', Types.mallocTy);
  };

  Frame.prototype.FREE = function FREE() {
    return getBuiltin(this, 'free', Types.freeTy);
  };

  Frame.prototype.MEMCPY = function MEMCPY(size) {
    return getBuiltin(this, 'memcpy', Types.memcpyTy);
  };

  Frame.prototype.MEMSET = function MEMSET(size) {
    return getBuiltin(this, 'memset', Types.memsetTy);
  };

  // Frame.prototype.MEMCHECK_CALL_PUSH = function MEMCHECK_CALL_PUSH() {
  //   return getCachedLocal(this, "memcheck_call_push", "dyn");
  // };

  // Frame.prototype.MEMCHECK_CALL_RESET = function MEMCHECK_CALL_RESET() {
  //   return getCachedLocal(this, "memcheck_call_reset", "dyn");
  // };

  // Frame.prototype.MEMCHECK_CALL_POP = function MEMCHECK_CALL_POP() {
  //   return getCachedLocal(this, "memcheck_call_pop", "dyn");
  // };

  Frame.prototype.getView = function getView(ty) {
    assert(ty);
    assert(ty.align);

    var alignType = ty.align;
    if (typeof alignType.signed === "undefined") {
      return getBuiltin(this, "F" + alignType.size);
    }
    return getBuiltin(this, (alignType.signed ? "I" : "U") + alignType.size);
  };

  Frame.prototype.SP = function SP() {
    if (!this.cachedSP) {
      this.cachedSP = cast(new Identifier(this.freshVariable("$SP").name), Types.spTy);
    }
    return this.cachedSP;
  };

  Frame.prototype.realSP = function realSP() {
    return cast(new MemberExpression(this.getView(Types.builtinTypes.uint), new Literal(1), true), Types.spTy);
  };

  Frame.prototype.close = function close() {
    const wordSize = Types.wordTy.size;
    var byteOffset = 0;
    var mangles = this.mangles;

    // The SP and frame sizes are in *bytes*, but the alignment is by
    // *double word*, to fit doubles.
    for (var name in mangles) {
      var variable = mangles[name];
      if (mangles[name].isStackAllocated) {
        var size = variable.type.size;
        variable.byteOffset = byteOffset;
        byteOffset += alignTo(size, wordSize * 2);
      }
    }

    this.frameSize = byteOffset;
  };

  exports.Variable = Variable;
  exports.Scope = Scope;
  exports.Frame = Frame;
  //exports.getCachedLocal = getCachedLocal;

}).call(this, typeof exports === "undefined" ? (scope = {}) : exports);


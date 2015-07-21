(function () {

  try {
    new Blob;
    $('#download-link').show();
  } catch (e) {}

  if (location.href.match(/debug/)) {
    $('#clear-database-link').show();
  }

  // localStorage warppers
  Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
  };

  Storage.prototype.getObject = function(key) {
    try {
      return JSON.parse(this.getItem(key));
    } catch(e) {
      return {};
    }
  };
  // ---

  // loading/storing votes
  var ls_key = 'jseu-voting';
  function loadVotes() {
    if(!window.localStorage.getObject(ls_key)) {
      window.localStorage.setObject(ls_key, []);
    }
    return window.localStorage.getObject(ls_key);
  }

  function storeVotes(votes) {
    window.localStorage.setObject(ls_key, votes);
  }
  // ---

  var keyParam = location.href.match(/key=(\w+)/);
  var sheetID;
  if (keyParam) {
    sheetID = keyParam[1];
  } else {
    var sheetUrl = keyParam ? keyParam[1] :
        prompt("Enter Google Spreadsheet URL",
            localStorage.getItem('sheetUrl') || '');
    localStorage.setItem('sheetUrl', sheetUrl);
    sheetID = sheetUrl.match(/\/spreadsheets\/d\/([^&]+)\//)[1];
  }

  // restore previous votes into the current vote form
  function loadValues() {
    var votes = loadVotes();
    var rowNo = parseInt($('#sheetRowNumber').val(), 10);
    // load persisted values
    var vote = votes[rowNo];
    if(!vote) {
      return;
    }
    $('#comment').val(vote.comment.replace(/\+/g, ' '));
    $('#vote_' + vote.vote).prop("checked", true);
  }

  function persistVote (e) {
    var vote = parseVote(($('#voter').serialize()));
    var votes = loadVotes();

    votes[vote.sheetRowNumber] = {
      vote: vote.vote,
      comment: vote.comment,
      id: vote.id,
    };
    storeVotes(votes);

    function successCallback () {
      $('body').css({ opacity: 1 });
    }
    $('body').css({ opacity: 0.5 });
    setTimeout(successCallback, 150);
    exportData(e);
    if (document.querySelector('#speed_mode').checked) {
      setTimeout(function() {
        document.querySelector('.pagination-next-fullTable').click();
        window.scrollTo(0,0);
      });
    }
  }

  var totalRows; // ugh global!
  function showInfo(data) {
    totalRows = data.length;
    data = data.map(function (proposal) {
      proposal.summary = proposal["presentationsummarytobeusedintheprogram"];
      proposal.extra = proposal["whatelsedoyouwanttotellusaboutthetalk"];
      proposal.sheetRowNumber = proposal.rowNumber + 1;
      return proposal;
    })
    var tableOptions = {"data": data
    , "pagination": 1, "tableDiv": "#fullTable", "filterDiv": "#fullTableFilter"}
    Sheetsee.makeTable(tableOptions)
    Sheetsee.initiateTableFilter(tableOptions)
    loadValues();
    $('body').removeClass('loading');
  }

  document.addEventListener('DOMContentLoaded', function() {
    Tabletop.init( { key: sheetID, callback: showInfo, simpleSheet: true } )
  })

  window.addEventListener('keydown', function(e) {
    var key = String.fromCharCode(e.keyCode);
    if (key) {
      $('#vote_' + key).click();
    }
  })

  // localStorage to csv
  function exportData(e) {
    e.preventDefault();
    var votes = loadVotes();
    var csv = '';
    for(var idx = 0; idx < totalRows; idx++) {
      var vote = votes[idx];
      if(vote) {
        csv += vote.id + ',' + vote.vote + ',' + vote.comment + '\n';
      } else {
        csv += '\n';
      }
    }
    $('#export').val(csv).show();
  }

  // helper
  function parseVote(s) {
    var vote = {};
    var kvs = s.split('&');
    kvs.forEach(function(kv) {
      var k_v = kv.split('=');
      var key = k_v[0];
      var value = k_v[1];
      if(key != 'comment') {
        value = parseInt(value, 10);
      }
      vote[k_v[0]] = value;
    });
    return vote;
  }

  function clearDatabase(e) {
    e.preventDefault();

    var confirmed = window.confirm('Do you really want to clear the whole database?');
    if (!confirmed) return;
    storeVotes([]);
    loadValues();
    $('[id^=vote_]').prop('checked', false);
  }

  function download(e) {
    e.preventDefault();
    exportData(e);

    var blob = new Blob(
      [$('#export').val()],
      {
        type: "text/comma-separated-values;charset=utf-8"
      }
    );
    saveAs(blob, "votes.csv");
  }

  $('.content').on('change', 'form input', persistVote);
  $('.content').on('blur', 'form textarea', persistVote)
  $('#export-link').on('click', exportData);
  $('#clear-database-link').on('click', clearDatabase);
  $('#download-link').on('click', download);
  $(window).on('hashchange', loadValues);
}());
